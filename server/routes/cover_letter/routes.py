from flask import jsonify, request
from utils.job_cleaner import trim_html
from utils.jwt_utils import validate_token
from utils.cover_letter_generator import (
    generate_cover_letter,
    validate_inputs,
    get_supported_tones
)
from config.database import get_db
from bson.objectid import ObjectId
import os, re

JWT_SECRET = os.getenv("JWT_SECRET", "your-256-bit-secret")
JWT_ALGORITHM = "HS256"
__all__ = ["validate_token", "JWT_SECRET", "JWT_ALGORITHM"]


def init_cover_letter_routes(app):

    @app.route("/api/cover-letter", methods=["POST"])
    def cover_letter():
        """
        Generate a cover letter using Gemini AI based on job posting and user's resume.
        """
        db = get_db()

        # ---------------- AUTH ----------------
        try:
            token = request.headers.get("Authorization")
            if not token:
                return jsonify({"error": "Missing authorization token"}), 401

            auth_token = validate_token(token.removeprefix("Bearer ").strip())
            user_id = auth_token["id"]
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        # ---------------- INPUT VALIDATION ----------------
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        raw_description = data.get("jobDescription")
        if not raw_description:
            return jsonify({"error": "Missing jobDescription field"}), 400

        try:
            clean_job_description = trim_html(raw_description)
        except Exception as e:
            return jsonify({"error": f"Failed to process job description: {str(e)}"}), 400

        # ---------------- FETCH USER & RESUME ----------------
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User not found"}), 404

            user_info = {
                "name": user.get("name"),
                "email": user.get("email"),
                "city": user.get("city"),
                "postal_code": user.get("postal_code"),
                "country": user.get("country"),
            }

            resume_id = user.get("latest_resume_id")
            if not resume_id:
                return jsonify({
                    "error": "No resume uploaded. Please upload your resume before generating a cover letter."
                }), 400

            resume_doc = db.user_resume.find_one({"_id": ObjectId(resume_id)})
            if not resume_doc or "resume_text" not in resume_doc:
                return jsonify({"error": "Resume text not found in database"}), 404

            resume_text = resume_doc["resume_text"]

        except Exception as e:
            return jsonify({"error": f"Error fetching resume: {str(e)}"}), 500

        # ---------------- CHECK INPUTS ----------------
        is_valid, error_message = validate_inputs(clean_job_description, resume_text)
        if not is_valid:
            return jsonify({"error": error_message}), 400

        tone = data.get("tone", "professional")
        user_prompt = data.get("userPrompt", "")
        job_title = data.get("jobTitle")
        company_name = data.get("companyName")

        if tone not in get_supported_tones():
            return jsonify({
                "error": f"Invalid tone '{tone}'. Supported tones: {', '.join(get_supported_tones())}"
            }), 400

        # ---------------- GENERATE COVER LETTER ----------------
        try:
            cover_letter_markdown = generate_cover_letter(
                user_info=user_info,
                job_posting=clean_job_description,
                resume=resume_text,
                tone=tone,
                user_prompt=user_prompt,
                job_title=job_title,
                company_name=company_name
            )
            print(cover_letter_markdown)
            return jsonify({
                "markdown": cover_letter_markdown,
                "clean_job_description": clean_job_description,
                "url": data.get("url"),
                "user_id": user_id,
                "jobTitle": job_title,
                "companyName": company_name,
                "location": data.get("location"),
                "tone": tone
            }), 200

        except Exception as e:
            return jsonify({"error": f"Failed to generate cover letter: {str(e)}"}), 500

    # ---------------- SUPPORTED TONES ----------------
    @app.route("/api/cover-letter/tones", methods=["GET"])
    def get_tones():
        """Return supported tone options."""
        return jsonify({"tones": get_supported_tones()}), 200
