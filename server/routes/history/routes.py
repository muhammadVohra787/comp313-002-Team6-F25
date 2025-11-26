from flask import jsonify, request, Response
from config.database import get_db
from utils.jwt_utils import validate_token
from bson.objectid import ObjectId
from datetime import datetime
from io import StringIO
import csv


def init_history_routes(app):

    # Get current user id from Authorization header
    def _get_user_id_from_request():
        token = request.headers.get("Authorization")
        if not token:
            return None, ("Missing authorization token", 401)

        try:
            # Expect header: "Bearer <token>"
            raw_token = token.removeprefix("Bearer ").strip()
            auth_token = validate_token(raw_token)
            user_id = auth_token.get("id")
            if not user_id:
                return None, ("Invalid token payload", 401)
            return user_id, None
        except Exception as e:
            return None, (f"Authentication failed: {str(e)}", 401)

    # GET /api/history  -> View job application history
    @app.route("/api/history", methods=["GET"])
    def get_history():
        """
        Return the current user's job application history.
        """
        db = get_db()

        user_id, error = _get_user_id_from_request()
        if error:
            msg, code = error
            return jsonify({"error": msg}), code

        try:
            cursor = (
                db.job_history
                .find({"user_id": ObjectId(user_id)})
                .sort("created_at", -1)
            )

            history = []
            for doc in cursor:
                created_at = doc.get("created_at")
                if isinstance(created_at, datetime):
                    created_at = created_at.isoformat()

                history.append({
                    "id": str(doc["_id"]),
                    "jobTitle": doc.get("job_title"),
                    "companyName": doc.get("company_name"),
                    "location": doc.get("location"),
                    "url": doc.get("url"),
                    "source": doc.get("source"),
                    "status": doc.get("status", "Not Applied"),
                    "tone": doc.get("tone"),
                    "createdAt": created_at
                })

            return jsonify({"history": history}), 200

        except Exception as e:
            return jsonify({"error": f"Failed to fetch history: {str(e)}"}), 500
        
    # GET /api/history/<history_id>/letters  -> All cover letter versions
    @app.route("/api/history/<history_id>/letters", methods=["GET"])
    def get_history_letters(history_id):
        """
        Return all saved cover letter versions for a given job history item.
        """
        db = get_db()

        user_id, error = _get_user_id_from_request()
        if error:
            msg, code = error
            return jsonify({"error": msg}), code

        try:
            cursor = (
                db.cover_letters
                .find({
                    "history_id": ObjectId(history_id),
                    "user_id": ObjectId(user_id)
                })
                .sort("created_at", 1)
            )

            letters = []
            for doc in cursor:
                created_at = doc.get("created_at")
                if isinstance(created_at, datetime):
                    created_at = created_at.isoformat()

                letters.append({
                    "id": str(doc["_id"]),
                    "version": doc.get("version"),
                    "tone": doc.get("tone"),
                    "userPrompt": doc.get("user_prompt", ""),
                    "markdown": doc.get("markdown", ""),
                    "createdAt": created_at,
                })

            return jsonify({"letters": letters}), 200

        except Exception as e:
            return jsonify({"error": f"Failed to fetch letter versions: {str(e)}"}), 500

    # PATCH /api/history/<history_id>/status  -> Mark Applied / Not Applied
    @app.route("/api/history/<history_id>/status", methods=["PATCH"])
    def update_history_status(history_id):
        """
        Update the status of a single job application.
        Body: { "status": "Applied" | "Not Applied" }
        """
        db = get_db()

        user_id, error = _get_user_id_from_request()
        if error:
            msg, code = error
            return jsonify({"error": msg}), code

        try:
            data = request.get_json() or {}
            new_status = data.get("status")
            if new_status not in ["Applied", "Not Applied"]:
                return jsonify({
                    "error": "Invalid status. Must be 'Applied' or 'Not Applied'."
                }), 400

            result = db.job_history.update_one(
                {"_id": ObjectId(history_id), "user_id": ObjectId(user_id)},
                {"$set": {"status": new_status}}
            )

            if result.matched_count == 0:
                return jsonify({"error": "History item not found"}), 404

            return jsonify({
                "id": history_id,
                "status": new_status
            }), 200

        except Exception as e:
            return jsonify({"error": f"Failed to update status: {str(e)}"}), 500

    # GET /api/history/export  -> Export job history as CSV for Google Sheets
    @app.route("/api/history/export", methods=["GET"])
    def export_history():
        """
        Export the current user's job history as CSV.
        Can be opened directly in Google Sheets.
        """
        db = get_db()

        user_id, error = _get_user_id_from_request()
        if error:
            msg, code = error
            return jsonify({"error": msg}), code

        try:
            cursor = (
                db.job_history
                .find({"user_id": ObjectId(user_id)})
                .sort("created_at", -1)
            )

            output = StringIO()
            writer = csv.writer(output)

            writer.writerow([
                "Job Title",
                "Company",
                "Location",
                "URL",
                "Source",
                "Status",
                "Tone",
                "Created At",
            ])

            for doc in cursor:
                created_at = doc.get("created_at")
                if isinstance(created_at, datetime):
                    created_at = created_at.isoformat()

                writer.writerow([
                    doc.get("job_title", ""),
                    doc.get("company_name", ""),
                    doc.get("location", ""),
                    doc.get("url", ""),
                    doc.get("source", ""),
                    doc.get("status", "Not Applied"),
                    doc.get("tone", ""),
                    created_at or "",
                ])

            csv_data = output.getvalue()
            output.close()

            return Response(
                csv_data,
                mimetype="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=job-history.csv"
                },
            )

        except Exception as e:
            return jsonify({"error": f"Failed to export history: {str(e)}"}), 500