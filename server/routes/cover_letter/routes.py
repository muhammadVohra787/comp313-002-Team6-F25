from flask import jsonify, request
from utils.job_cleaner import trim_html
from utils.jwt_utils import validate_token
import os

JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
JWT_ALGORITHM = 'HS256'
__all__ = ['validate_token', 'JWT_SECRET', 'JWT_ALGORITHM']

def init_cover_letter_routes(app):
    @app.route('/api/cover-letter', methods=['POST'])
    def cover_letter():
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token is required"}), 400
            
        try:
            validate_token(token.removeprefix("Bearer ").strip())
        except Exception as e:
            return jsonify({"error": str(e)}), 401
            
        data = request.get_json()
        raw_description = data.get('jobDescription')
        clean_job_description = trim_html(raw_description)
        return jsonify({
            'clean_job_description': clean_job_description,
            'url': data.get('url')
        }), 200