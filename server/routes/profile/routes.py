from flask import jsonify, request
from config.database import get_db
from utils.jwt_utils import validate_token
from bson.objectid import ObjectId
import gridfs  # ← You forgot to import this
from utils.files_utils import extract_text_from_file
import io
from utils.user_utils import check_attention_needed
from flask import send_file
from bson import ObjectId

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

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

        # Extract text and reset buffer
        file_bytes = io.BytesIO(file.read())
        resume_text = extract_text_from_file(file_bytes, file.filename)
        file_bytes.seek(0)

        # Remove old resume if exists
        existing_resume = db.user_resume.find_one({"user_id": ObjectId(user_id)})
        if existing_resume:
            fs.delete(existing_resume["resume_file"])
            db.user_resume.delete_one({"_id": existing_resume["_id"]})

        # Save new resume in GridFS
        file_id = fs.put(file_bytes, filename=file.filename, content_type=file.content_type)

        # Save resume metadata
        resume_data = {
            "user_id": ObjectId(user_id),
            "file_name": file.filename,
            "resume_text": resume_text,
            "resume_file": file_id,
        }
        resume_id = db.user_resume.insert_one(resume_data).inserted_id

        # Prepare updates for user
        update_fields = {
            "latest_resume_id": resume_id,
        }

        # Compute attention_needed in one go
        user = db.users.find_one({"_id": ObjectId(user_id)})
        user.update(update_fields)
        update_fields["attention_needed"] = check_attention_needed(user)

        # Update user in DB
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Convert user object for response
        user.update(update_fields)
        user["_id"] = str(user["_id"])
        for key, value in user.items():
            if isinstance(value, ObjectId):
                user[key] = str(value)

        # Populate resume info
        user["resume"] = {
            "file_name": file.filename,
            "text": resume_text,
            "id": str(resume_id),
        }

        return jsonify({
            "message": "Resume uploaded successfully",
            "user": user
        }), 201