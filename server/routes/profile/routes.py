from flask import jsonify, request
from config.database import get_db
from utils.jwt_utils import validate_token
from bson.objectid import ObjectId
import gridfs
from utils.files_utils import extract_text_from_file
import io
from utils.user_utils import check_attention_needed
from flask import send_file
from bson import ObjectId
from werkzeug.utils import secure_filename
import mimetypes

try:
    import magic
    HAS_MAGIC = True
except Exception:
    HAS_MAGIC = False

ALLOWED_EXTS = {"pdf", "doc", "docx", "txt"}
ALLOWED_MIME_PREFIXES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

def is_allowed_extension(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS

def sniff_mime(file_bytes: bytes, fallback: str | None) -> str:
    if HAS_MAGIC:
        # Detect from content
        return magic.from_buffer(file_bytes[:4096], mime=True) or (fallback or "")
    # Fallback to provided content_type or guess by extension
    if fallback:
        return fallback
    return mimetypes.guess_type("x." + "bin")[0] or ""

def init_profile_routes(app):
    @app.route('/api/profile', methods=['GET'])
    def profile():
        db = get_db()

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Authorization header missing"}), 401

        try:
            payload = validate_token(token.removeprefix("Bearer ").strip())
            user_id = payload.get("id")
        except Exception as e:
            print(e)
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Convert top-level ObjectIds to strings
            for key, value in user.items():
                if isinstance(value, ObjectId):
                    user[key] = str(value)

            # Populate resume info if exists
            latest_resume = None
            if "latest_resume_id" in user and user["latest_resume_id"]:
                latest_resume = db.user_resume.find_one({"_id": ObjectId(user["latest_resume_id"])})
            if latest_resume:
                user["resume"] = {
                    "file_name": latest_resume["file_name"],
                    "text": latest_resume["resume_text"],
                    "id": str(latest_resume["_id"]),
                }
            else:
                user["resume"] = None

            return jsonify({"user": user}), 200

        except Exception as e:
            print(e)
            return jsonify({"error": f"Error fetching user: {str(e)}"}), 500

    # -------------------------------
    # Upload Resume Route
    # -------------------------------

    @app.route('/api/profile', methods=['POST'])
    def update_profile():
        db = get_db()
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        # Validate JWT and get user ID
        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Only allow updates to these fields
        allowed_fields = {
            "name", "city", "country", "postal_code", "personal_prompt"
        }
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Fetch current user
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Apply updates locally
        user.update(update_data)

        # Check if attention is needed
        attention_needed = check_attention_needed(user)
        user["attention_needed"] = attention_needed

        # Update DB
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": user})

        # Convert ObjectId to string for JSON response
        user["_id"] = str(user["_id"])

        return jsonify({
            "message": "Profile updated successfully",
            "user": user
        }), 200

    @app.route('/api/profile/resume', methods=['GET'])
    def download_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user or "latest_resume_id" not in user:
            return jsonify({"error": "No resume found"}), 404

        resume = db.user_resume.find_one({"_id": user["latest_resume_id"]})
        if not resume:
            return jsonify({"error": "Resume not found"}), 404

        # Stream file from GridFS
        grid_out = fs.get(resume["resume_file"])
        return send_file(
            grid_out,
            download_name=resume["file_name"],
            as_attachment=True,
            mimetype=grid_out.content_type
        )
    
    @app.route('/api/profile/resume', methods=['POST'])
    def upload_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        up = request.files.get("file")
        if not up:
            return jsonify({"error": "No file uploaded"}), 400

        # Extension gate
        filename = secure_filename(up.filename or "")
        if not is_allowed_extension(filename):
            return jsonify({"error": "Unsupported file type. Only .pdf, .doc, .docx, .txt allowed."}), 400

        # Read once into memory for sniff + extraction; reset later
        raw = up.read()
        if not raw:
            return jsonify({"error": "Empty file"}), 400

        # MIME sniff
        detected_mime = sniff_mime(raw, up.content_type)
        if not any(detected_mime.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
            return jsonify({"error": f"Unsupported MIME type: {detected_mime}"}), 400

        # Extract text
        file_buf = io.BytesIO(raw)
        resume_text = extract_text_from_file(file_buf, filename)
        # If extraction function flags unsupported, block save
        if resume_text.strip() in {"[Unsupported file type]"}:
            return jsonify({"error": "Unsupported file type"}), 400

        # Block empty extractions for pdf/docx
        if filename.lower().endswith((".pdf", ".doc", ".docx")) and not resume_text.strip():
            return jsonify({"error": "Could not extract text. Please upload a text-based PDF/DOCX."}), 422

        file_buf.seek(0)

        # Only now delete the old resume
        existing_resume = db.user_resume.find_one({"user_id": ObjectId(user_id)})
        if existing_resume:
            try:
                fs.delete(existing_resume["resume_file"])
            except Exception:
                # If GridFS blob missing, continue with metadata cleanup
                pass
            db.user_resume.delete_one({"_id": existing_resume["_id"]})

        # Save new resume
        file_id = fs.put(file_buf, filename=filename, content_type=detected_mime or up.content_type)
        resume_data = {
            "user_id": ObjectId(user_id),
            "file_name": filename,
            "resume_text": resume_text,
            "resume_file": file_id,
        }
        resume_id = db.user_resume.insert_one(resume_data).inserted_id

        # Update user & attention flag
        update_fields = {"latest_resume_id": resume_id}
        user = db.users.find_one({"_id": ObjectId(user_id)})
        user.update(update_fields)
        update_fields["attention_needed"] = check_attention_needed(user)
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Response
        user.update(update_fields)
        user["_id"] = str(user["_id"])
        for k, v in list(user.items()):
            if isinstance(v, ObjectId):
                user[k] = str(v)
        user["resume"] = {
            "file_name": filename,
            "text": resume_text,
            "id": str(resume_id),
        }

        return jsonify({"message": "Resume uploaded successfully", "user": user}), 201