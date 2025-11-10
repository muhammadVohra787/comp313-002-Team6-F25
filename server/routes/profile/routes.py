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

# Optional file-type detection using python-magic (if installed)
try:
    import magic
    HAS_MAGIC = True
except Exception:
    HAS_MAGIC = False

# Allowed file extensions for resume upload
ALLOWED_EXTS = {"pdf", "doc", "docx", "txt"}

# Allowed MIME-type prefixes for extra safety
ALLOWED_MIME_PREFIXES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

def is_allowed_extension(filename: str) -> bool:
    """Check if uploaded filename has an allowed extension."""
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS

def sniff_mime(file_bytes: bytes, fallback: str | None) -> str:
    """
    Try to detect MIME type from file content.
    If python-magic is not available, fall back to provided content_type or guess.
    """
    if HAS_MAGIC:
        # Use content-based detection
        return magic.from_buffer(file_bytes[:4096], mime=True) or (fallback or "")
    # Fallback to client-provided content_type or extension-based guess
    if fallback:
        return fallback
    return mimetypes.guess_type("x." + "bin")[0] or ""

def init_profile_routes(app):
    @app.route('/api/profile', methods=['GET'])
    def profile():
        # Get DB instance
        db = get_db()

        # Get and validate JWT from Authorization header
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
            # Fetch user by ID
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Convert any ObjectId at top level to string for JSON
            for key, value in user.items():
                if isinstance(value, ObjectId):
                    user[key] = str(value)

            # If user has uploaded a resume before, attach its info
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
    # Update Profile (basic fields)
    # -------------------------------
    @app.route('/api/profile', methods=['POST'])
    def update_profile():
        db = get_db()

        # Require valid token to update profile
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        # Validate JWT and extract user ID
        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        # Get JSON body
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Only allow certain profile fields to be updated
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

        # Update in-memory user dict
        user.update(update_data)

        # Recalculate attention flag based on updated profile
        attention_needed = check_attention_needed(user)
        user["attention_needed"] = attention_needed

        # Save changes to DB
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": user})

        # Convert ObjectId for response
        user["_id"] = str(user["_id"])

        return jsonify({
            "message": "Profile updated successfully",
            "user": user
        }), 200

    # -------------------------------
    # Download latest resume
    # -------------------------------
    @app.route('/api/profile/resume', methods=['GET'])
    def download_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        # Check token
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        # Find user and their latest resume
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user or "latest_resume_id" not in user:
            return jsonify({"error": "No resume found"}), 404

        resume = db.user_resume.find_one({"_id": user["latest_resume_id"]})
        if not resume:
            return jsonify({"error": "Resume not found"}), 404

        # Fetch actual file contents from GridFS
        grid_out = fs.get(resume["resume_file"])
        return send_file(
            grid_out,
            download_name=resume["file_name"],
            as_attachment=True,
            mimetype=grid_out.content_type
        )
    
    # -------------------------------
    # Upload / Replace resume
    # -------------------------------
    @app.route('/api/profile/resume', methods=['POST'])
    def upload_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        # Require token
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        # Get uploaded file from form-data
        up = request.files.get("file")
        if not up:
            return jsonify({"error": "No file uploaded"}), 400

        # Sanitize filename and check extension
        filename = secure_filename(up.filename or "")
        if not is_allowed_extension(filename):
            return jsonify({"error": "Unsupported file type. Only .pdf, .doc, .docx, .txt allowed."}), 400

        # Read file bytes once (for mime sniff and text extraction)
        raw = up.read()
        if not raw:
            return jsonify({"error": "Empty file"}), 400

        # Detect MIME type from content or fallback
        detected_mime = sniff_mime(raw, up.content_type)
        if not any(detected_mime.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
            return jsonify({"error": f"Unsupported MIME type: {detected_mime}"}), 400

        # Extract resume text (this is used later for cover letter prompts, etc.)
        file_buf = io.BytesIO(raw)
        resume_text = extract_text_from_file(file_buf, filename)

        # If extractor says unsupported, stop here
        if resume_text.strip() in {"[Unsupported file type]"}:
            return jsonify({"error": "Unsupported file type"}), 400

        # For PDF/DOC/DOCX we expect non-empty extracted text
        if filename.lower().endswith((".pdf", ".doc", ".docx")) and not resume_text.strip():
            return jsonify({"error": "Could not extract text. Please upload a text-based PDF/DOCX."}), 422

        # Reset pointer before saving to GridFS
        file_buf.seek(0)

        # If user already has a resume, remove old file + metadata
        existing_resume = db.user_resume.find_one({"user_id": ObjectId(user_id)})
        if existing_resume:
            try:
                fs.delete(existing_resume["resume_file"])
            except Exception:
                # If file missing in GridFS, still delete DB record
                pass
            db.user_resume.delete_one({"_id": existing_resume["_id"]})

        # Save new resume file into GridFS
        file_id = fs.put(file_buf, filename=filename, content_type=detected_mime or up.content_type)

        # Save resume metadata into separate collection
        resume_data = {
            "user_id": ObjectId(user_id),
            "file_name": filename,
            "resume_text": resume_text,
            "resume_file": file_id,
        }
        resume_id = db.user_resume.insert_one(resume_data).inserted_id

        # Update user record with latest resume ID and attention flag
        update_fields = {"latest_resume_id": resume_id}
        user = db.users.find_one({"_id": ObjectId(user_id)})
        user.update(update_fields)
        update_fields["attention_needed"] = check_attention_needed(user)
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Build clean response
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

    @app.route('/api/profile/resume', methods=['DELETE'])
    def delete_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        resume_id = user.get("latest_resume_id")
        if not resume_id:
            return jsonify({"error": "No resume to delete"}), 404

        resume = db.user_resume.find_one({"_id": ObjectId(resume_id)})
        if resume:
            try:
                fs.delete(resume["resume_file"])
            except Exception:
                pass
            db.user_resume.delete_one({"_id": resume["_id"]})

        # Remove resume reference from user and recompute attention flag
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$unset": {"latest_resume_id": ""},
                "$set": {"attention_needed": check_attention_needed({k: v for k, v in user.items() if k != "latest_resume_id"})},
            },
        )

        updated_user = db.users.find_one({"_id": ObjectId(user_id)})
        updated_user["_id"] = str(updated_user["_id"])
        for key, value in list(updated_user.items()):
            if isinstance(value, ObjectId):
                updated_user[key] = str(value)
        updated_user["resume"] = None

        return jsonify({"message": "Resume deleted successfully", "user": updated_user}), 200
