from flask import jsonify, request
from config.database import get_db
from utils.jwt_utils import validate_token
from bson.objectid import ObjectId
import gridfs  # ← You forgot to import this
from utils.files_utils import extract_text_from_file
import io

def init_profile_routes(app):
    @app.route('/api/profile', methods=['GET'])
    def profile():
        db = get_db()

        # 1. Validate token and get user ID
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Authorization header missing"}), 401

        try:
            payload = validate_token(token.removeprefix("Bearer ").strip())
            user_id = payload.get("id")
        except Exception as e:
            print(e)
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

        # 2. Fetch user from DB
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found"}), 404
        except Exception as e:
            print(e)
            return jsonify({"error": f"Error fetching user: {str(e)}"}), 500

        # 3. Return user object (convert ObjectId fields to str if any)
        user["_id"] = str(user["_id"])
        if "resume_id" in user:
            user["resume_id"] = str(user["resume_id"])

        return jsonify({"user": user}), 200

    # -------------------------------
    # Upload Resume Route
    # -------------------------------
    @app.route('/api/profile', methods=['POST'])
    def upload_resume():
        db = get_db()
        fs = gridfs.GridFS(db)

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing token"}), 401

        payload = validate_token(token.removeprefix("Bearer ").strip())
        user_id = payload.get("id")

        # Extract file
        file = request.files.get("  ")
        if not file:
            return jsonify({"error": "No file uploaded"}), 400

        # Extract readable text
        file_bytes = io.BytesIO(file.read())
        resume_text = extract_text_from_file(file_bytes, file.filename)

        # Reset file for GridFS
        file_bytes.seek(0)
        file_id = fs.put(file_bytes, filename=file.filename, content_type=file.content_type)

        # Limit to 3 resumes per user
        user_resumes = list(db.user_resume.find({"user_id": ObjectId(user_id)}).sort("_id", 1))
        if len(user_resumes) >= 3:
            oldest = user_resumes[0]
            fs.delete(oldest["resume_file"])
            db.user_resume.delete_one({"_id": oldest["_id"]})

        # Save metadata
        resume_data = {
            "user_id": ObjectId(user_id),
            "file_name": file.filename,
            "resume_text": resume_text,
            "resume_file": file_id,
        }

        resume_id = db.user_resume.insert_one(resume_data).inserted_id

        # Update user's profile
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"resume": resume_id}}
        )

        return jsonify({
            "message": "Resume uploaded successfully",
            "resume_id": str(resume_id),
        }), 201