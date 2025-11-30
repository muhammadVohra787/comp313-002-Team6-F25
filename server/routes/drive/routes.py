from flask import jsonify, request
from bson.objectid import ObjectId
from datetime import datetime

from config.database import get_db
from utils.jwt_utils import validate_token
from utils.drive_utils import upload_file_to_drive, GoogleDriveError


def init_drive_routes(app):

    # Helper to extract & validate user id from Authorization header
    def _get_user_id_from_request():
        token = request.headers.get("Authorization")
        if not token:
            return None, ("Missing authorization token", 401)

        try:
            raw_token = token.removeprefix("Bearer ").strip()
            payload = validate_token(raw_token)
            user_id = payload.get("id")
            if not user_id:
                return None, ("Invalid token payload", 401)
            return user_id, None
        except Exception as e:
            return None, (f"Authentication failed: {str(e)}", 401)

    # -------------------------------
    # POST /api/drive/cover-letter
    # -------------------------------
    @app.route("/api/drive/cover-letter", methods=["POST"])
    def save_cover_letter_to_drive():
        """
        Save the current cover letter as a Word document to the user's Google Drive.
        Expects:
          - Authorization: Bearer <JWT token> (our backend auth)
          - X-Google-Token: <Google OAuth access token> (for Drive)
          - multipart/form-data with:
              - file: the .doc content (sent by the extension)
              - jobTitle (optional)
              - companyName (optional)
        """
        db = get_db()

        # 1. Auth: our own JWT
        user_id, error = _get_user_id_from_request()
        if error:
            msg, code = error
            return jsonify({"error": msg}), code

        # 2. Auth: Google OAuth token (for Drive API)
        google_token = request.headers.get("X-Google-Token")
        if not google_token:
            return jsonify({"error": "Missing X-Google-Token header"}), 401

        # 3. File from form-data
        up = request.files.get("file")
        if not up:
            return jsonify({"error": "No file uploaded"}), 400

        file_bytes = up.read()
        if not file_bytes:
            return jsonify({"error": "Empty file"}), 400

        filename = up.filename or "CoverLetter.doc"
        mime_type = up.mimetype or "application/msword"

        job_title = request.form.get("jobTitle") or ""
        company_name = request.form.get("companyName") or ""

        try:
            # 4. Upload to Google Drive
            drive_file = upload_file_to_drive(
                google_access_token=google_token,
                file_bytes=file_bytes,
                file_name=filename,
                mime_type=mime_type,
            )

            return jsonify(
                {
                    "success": True,
                    "file": drive_file,
                }
            ), 200

        except GoogleDriveError as e:
            return jsonify({"error": str(e)}), 502
        except Exception as e:
            return jsonify(
                {"error": f"Failed to save to Google Drive: {str(e)}"}
            ), 500
