# from flask import jsonify, request, send_file
# from utils.job_cleaner import trim_html
# from utils.jwt_utils import validate_token
# from utils.cover_letter_generator import (
#     generate_cover_letter,
#     validate_inputs,
#     get_supported_tones
# )
# from config.database import get_db
# from bson.objectid import ObjectId
# import io, os

# JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
# JWT_ALGORITHM = 'HS256'
# __all__ = ['validate_token', 'JWT_SECRET', 'JWT_ALGORITHM']


# def init_cover_letter_routes(app):
    
#     @app.route('/api/cover-letter', methods=['POST'])
#     def cover_letter():
#         """
#         Generate a cover letter from job description and user's resume.
        
#         Expected JSON body:
#         {
#             "jobDescription": "HTML job description",
#             "url": "Job posting URL",
#             "jobTitle": "Job title (optional)",
#             "companyName": "Company name (optional)",
#             "location": "Job location (optional)",
#             "tone": "professional|enthusiastic|casual|formal (optional, default: professional)",
#             "userPrompt": "Additional instructions (optional)"
#         }
#         """
#         db = get_db()
        
#         # Authenticate user
#         try:
#             token = request.headers.get("Authorization")
#             if not token:
#                 return jsonify({"error": "Missing authorization token"}), 401
                
#             auth_token = validate_token(token.removeprefix("Bearer ").strip())
#             user_id = auth_token["id"]
#         except Exception as e:
#             return jsonify({"error": f"Authentication failed: {str(e)}"}), 401
        
#         # Get request data
#         data = request.get_json()
#         if not data:
#             return jsonify({"error": "No data provided"}), 400
        
#         raw_description = data.get('jobDescription')
#         if not raw_description:
#             return jsonify({"error": "Missing jobDescription field"}), 400
        
#         # Clean job description HTML
#         try:
#             clean_job_description = trim_html(raw_description)
#         except Exception as e:
#             return jsonify({"error": f"Failed to process job description: {str(e)}"}), 400
        
#         # Get user's resume from database
#         try:
#             user = db.users.find_one({"_id": ObjectId(user_id)})
#             if not user:
#                 return jsonify({"error": "User not found"}), 404
            
#             if "latest_resume_id" not in user or not user["latest_resume_id"]:
#                 return jsonify({
#                     "error": "No resume uploaded. Please upload your resume in the Profile section before generating a cover letter."
#                 }), 400
            
#             resume_doc = db.user_resume.find_one({"_id": ObjectId(user["latest_resume_id"])})
#             if not resume_doc or "resume_text" not in resume_doc:
#                 return jsonify({"error": "Resume text not found in database"}), 404
            
#             resume_text = resume_doc["resume_text"]
            
#         except Exception as e:
#             return jsonify({"error": f"Error fetching resume: {str(e)}"}), 500
        
#         # Validate inputs
#         is_valid, error_message = validate_inputs(clean_job_description, resume_text)
#         if not is_valid:
#             return jsonify({"error": error_message}), 400
        
#         # Get optional parameters
#         tone = data.get('tone', 'professional')
#         user_prompt = data.get('userPrompt', '')
#         job_title = data.get('jobTitle')
#         company_name = data.get('companyName')
        
#         # Validate tone
#         if tone not in get_supported_tones():
#             return jsonify({
#                 "error": f"Invalid tone '{tone}'. Supported tones: {', '.join(get_supported_tones())}"
#             }), 400

#  # === Generate cover letter with Gemini ===
#         # === Generate cover letter with Gemini ===
#         try:
#             # Fetch user profile details for header
#             profile_fields = {
#                 "name": user.get("name"),
#                 "city": user.get("city"),
#                 "country": user.get("country"),
#                 "postal_code": user.get("postal_code"),
#                 "email": user.get("email"),
#             }

#             # Build professional header (only non-empty fields)
#             contact_parts = [profile_fields.get("email")]
#             header_html = f"""
#             <div style='text-align:left; margin-bottom:18pt; line-height:1.4; font-family:"Times New Roman", serif;'>
#                 <strong style='font-size:14pt;'>{profile_fields.get("name","")}</strong><br/>
#                 {", ".join(filter(None, [profile_fields.get("city"), profile_fields.get("country")]))} {profile_fields.get("postal_code","")}<br/>
#                 {" | ".join(filter(None, contact_parts))}
#             </div>
#             """
#             font_style = """
#             <style>
#             body, p, div, span {
#                 font-family: 'Times New Roman', serif;
#                 font-size: 12pt;
#                 line-height: 1.5;
#                 color: #111;
#             }
#             strong { font-weight: 600; }
#             </style>
#             """
#             # === Generate body from Gemini ===
#             cover_letter_body = generate_cover_letter(
#                 job_posting=clean_job_description,
#                 resume=resume_text,
#                 tone=tone,
#                 user_prompt=user_prompt,
#                 job_title=job_title,
#                 company_name=company_name
#             )

#             # Combine header + body
#             cover_letter_html = font_style + header_html + cover_letter_body

#             # Return HTML (and optional base64 PDF)
#             return jsonify({
#                 "html": cover_letter_html,
#                 "clean_job_description": clean_job_description,
#                 "url": data.get("url"),
#                 "user_id": user_id,
#                 "jobTitle": job_title,
#                 "companyName": company_name,
#                 "location": data.get("location"),
#                 "tone": tone
#             }), 200

#         except Exception as e:
#             return jsonify({
#                 "error": f"Failed to generate cover letter: {str(e)}"
#             }), 500

        
#     @app.route('/api/cover-letter/tones', methods=['GET'])
#     def get_tones():
#         """
#         Get list of supported tone options for cover letter generation.
#         Useful for frontend to populate dropdown options.
#         """
#         return jsonify({
#             'tones': get_supported_tones()
#         }), 200
    

# from flask import jsonify, request
# from utils.job_cleaner import trim_html
# from utils.jwt_utils import validate_token
# from utils.cover_letter_generator import (
#     generate_cover_letter,
#     validate_inputs,
#     get_supported_tones
# )
# from config.database import get_db
# from bson.objectid import ObjectId
# import os, re


# JWT_SECRET = os.getenv("JWT_SECRET", "your-256-bit-secret")
# JWT_ALGORITHM = "HS256"
# __all__ = ["validate_token", "JWT_SECRET", "JWT_ALGORITHM"]


# def init_cover_letter_routes(app):

#     @app.route("/api/cover-letter", methods=["POST"])
#     def cover_letter():
#         """
#         Generate a cover letter using Gemini AI based on job posting and user's resume.
#         """
#         db = get_db()

#         # ---------------- AUTH ----------------
#         try:
#             token = request.headers.get("Authorization")
#             if not token:
#                 return jsonify({"error": "Missing authorization token"}), 401

#             auth_token = validate_token(token.removeprefix("Bearer ").strip())
#             user_id = auth_token["id"]
#         except Exception as e:
#             return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

#         # ---------------- INPUT VALIDATION ----------------
#         data = request.get_json()
#         if not data:
#             return jsonify({"error": "No data provided"}), 400

#         raw_description = data.get("jobDescription")
#         if not raw_description:
#             return jsonify({"error": "Missing jobDescription field"}), 400

#         try:
#             clean_job_description = trim_html(raw_description)
#         except Exception as e:
#             return jsonify({"error": f"Failed to process job description: {str(e)}"}), 400

#         # ---------------- FETCH USER & RESUME ----------------
#         try:
#             user = db.users.find_one({"_id": ObjectId(user_id)})
#             if not user:
#                 return jsonify({"error": "User not found"}), 404

#             resume_id = user.get("latest_resume_id")
#             if not resume_id:
#                 return jsonify({
#                     "error": "No resume uploaded. Please upload your resume before generating a cover letter."
#                 }), 400

#             resume_doc = db.user_resume.find_one({"_id": ObjectId(resume_id)})
#             if not resume_doc or "resume_text" not in resume_doc:
#                 return jsonify({"error": "Resume text not found in database"}), 404

#             resume_text = resume_doc["resume_text"]

#         except Exception as e:
#             return jsonify({"error": f"Error fetching resume: {str(e)}"}), 500

#         # ---------------- CHECK INPUTS ----------------
#         is_valid, error_message = validate_inputs(clean_job_description, resume_text)
#         if not is_valid:
#             return jsonify({"error": error_message}), 400

#         tone = data.get("tone", "professional")
#         user_prompt = data.get("userPrompt", "")
#         job_title = data.get("jobTitle")
#         company_name = data.get("companyName")

#         if tone not in get_supported_tones():
#             return jsonify({
#                 "error": f"Invalid tone '{tone}'. Supported tones: {', '.join(get_supported_tones())}"
#             }), 400

#         # ---------------- HELPER: Extract info ----------------
#         def extract_resume_info(text):
#             """
#             Smart extraction of user contact info from resume text.
#             Avoids tech-word false positives (like 'Pandas', 'React', etc.).
#             """
#             lines = [l.strip() for l in text.splitlines() if l.strip()]
#             joined = " ".join(lines)

#             # Email
#             email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', joined)

#             # Phone (common NA formats)
#             phone_match = re.search(
#                 r'(\+?1[\s\-\.]*)?(?:\(?\d{3}\)?[\s\-\.]*)?\d{3}[\s\-\.]*\d{4}',
#                 joined
#             )

#             # Postal / ZIP
#             postal_match = re.search(r'([A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d|\b\d{5}(?:-\d{4})?\b)', joined)

#             # Address line (street-like keywords)
#             address_line = None
#             address_pattern = re.search(
#                 r'\b\d{1,5}\s+[A-Za-z0-9\s]+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)\b',
#                 joined, re.IGNORECASE
#             )
#             if address_pattern:
#                 address_line = address_pattern.group(0).strip()

#             # City detection (with safeguard)
#             city_match = None
#             city_pattern = re.search(
#                 r'\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*),\s*(?:[A-Z][a-zA-Z]+|[A-Z]{2})(?:[\s,]\d{5}|\s*[A-Za-z]\d[A-Za-z])?',
#                 joined
#             )
#             if city_pattern:
#                 city_candidate = city_pattern.group(1)
#                 banned = {"Python", "Pandas", "NumPy", "Java", "Spring", "React", "Node", "TensorFlow", "SQL", "AWS"}
#                 if city_candidate not in banned:
#                     city_match = city_candidate

#             # Name (first line — capitalized)
#             name_match = None
#             if lines:
#                 first_line = lines[0]
#                 if re.match(r'^[A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)+$', first_line) or first_line.isupper():
#                     name_match = re.sub(r',.*$', '', first_line).title().strip()

#             return {
#                 "name": name_match,
#                 "email": email_match.group(0) if email_match else None,
#                 "phone": phone_match.group(0) if phone_match else None,
#                 "address": address_line,
#                 "postal_code": postal_match.group(0) if postal_match else None,
#                 "city": city_match.title() if city_match else None
#             }

#         # ---------------- BUILD HEADER ----------------
#         try:
#             resume_info = extract_resume_info(resume_text)

#             profile_fields = {
#                 "name": resume_info.get("name"),
#                 "address": resume_info.get("address"),
#                 "city": resume_info.get("city"),
#                 "postal_code": resume_info.get("postal_code"),
#                 "email": resume_info.get("email"),
#                 "phone": resume_info.get("phone"),
#             }

#             # Address lines
#             address_lines = []
#             if profile_fields.get("address"):
#                 address_lines.append(profile_fields["address"])
#             if profile_fields.get("city") or profile_fields.get("postal_code"):
#                 address_lines.append(", ".join(filter(None, [profile_fields.get("city"), profile_fields.get("postal_code")])))

#             contact_line = " | ".join(filter(None, [profile_fields.get("phone"), profile_fields.get("email")]))
#             address_html = "<br>".join(address_lines)

#             header_html = f"""
#             <div style='text-align:left; margin-bottom:18pt; line-height:1.5;
#                         font-family:"Times New Roman",serif; font-size:12pt; color:#111;'>
#                 {f"<div style='font-weight:600; font-size:12pt;'>{profile_fields.get('name')}</div>" if profile_fields.get('name') else ''}
#                 {f"<div>{address_html}</div>" if address_html else ''}
#                 <div>{contact_line}</div>
#             </div>
#             """
#         except Exception as e:
#             return jsonify({"error": f"Failed to extract resume details: {str(e)}"}), 500

#         # ---------------- GENERATE COVER LETTER ----------------
#         try:
#             cover_letter_body = generate_cover_letter(
#                 job_posting=clean_job_description,
#                 resume=resume_text,
#                 tone=tone,
#                 user_prompt=user_prompt,
#                 job_title=job_title,
#                 company_name=company_name
#             )

#             # Clean placeholders
#             cover_letter_body = re.sub(r'\[.*?(omit|not provided).*?\]', '', cover_letter_body, flags=re.IGNORECASE)
#             cover_letter_body = re.sub(r'\n\s*\n\s*\n+', '\n\n', cover_letter_body)
#             cover_letter_body = re.sub(r',\s*,', ',', cover_letter_body)

#             font_style = """
#             <style>
#                 body, p, div, span {
#                     font-family: 'Times New Roman', serif;
#                     font-size: 12pt;
#                     line-height: 1.5;
#                     color: #111;
#                 }
#                 p { margin-top: 0; margin-bottom: 4pt; }
#             </style>
#             """

#             cover_letter_html = font_style + header_html + cover_letter_body

#             return jsonify({
#                 "html": cover_letter_html,
#                 "clean_job_description": clean_job_description,
#                 "url": data.get("url"),
#                 "user_id": user_id,
#                 "jobTitle": job_title,
#                 "companyName": company_name,
#                 "location": data.get("location"),
#                 "tone": tone
#             }), 200

#         except Exception as e:
#             return jsonify({"error": f"Failed to generate cover letter: {str(e)}"}), 500


#     # ---------------- SUPPORTED TONES ----------------
#     @app.route("/api/cover-letter/tones", methods=["GET"])
#     def get_tones():
#         """Return supported tone options."""
#         return jsonify({"tones": get_supported_tones()}), 200



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
            cover_letter_html = generate_cover_letter(
                job_posting=clean_job_description,
                resume=resume_text,
                tone=tone,
                user_prompt=user_prompt,
                job_title=job_title,
                company_name=company_name
            )

            # Clean placeholders and formatting artifacts
            cover_letter_html = re.sub(r'\[.*?(omit|not provided).*?\]', '', cover_letter_html, flags=re.IGNORECASE)
            cover_letter_html = re.sub(r'\n\s*\n\s*\n+', '\n\n', cover_letter_html)
            cover_letter_html = re.sub(r',\s*,', ',', cover_letter_html)

            # Inject consistent styling globally
            font_style = """
            <style>
                body, p, div, span {
                    font-family: 'Times New Roman', serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    color: #111;
                }
                p { margin-top: 0; margin-bottom: 4pt; }
            </style>
            """

            cover_letter_html = font_style + cover_letter_html

            return jsonify({
                "html": cover_letter_html,
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
