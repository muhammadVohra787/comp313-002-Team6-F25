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
        user_id = None 
        try:
            token = request.headers.get("Authorization")
            auth_token = validate_token(token.removeprefix("Bearer ").strip())
            user_id = auth_token["id"]

        except Exception as e:
            return jsonify({"error": str(e)}), 401
            
        data = request.get_json()
        raw_description = data.get('jobDescription')
        clean_job_description = trim_html(raw_description)
        return jsonify({
            'clean_job_description': clean_job_description,
            'url': data.get('url'),
            'user_id': user_id
        }), 200