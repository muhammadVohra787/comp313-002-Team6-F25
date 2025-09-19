from flask import jsonify, request
import requests
from bson import ObjectId
from datetime import datetime, timedelta
from config.database import get_db
from utils.jwt_utils import create_access_token
from jwt import ExpiredSignatureError, InvalidTokenError
import jwt
import os
from utils.jwt_utils import validate_token
# Import JWT config directly
JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
JWT_ALGORITHM = 'HS256'

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

def init_auth_routes(app):
    @app.route("/api/auth/google", methods=["POST"])
    def auth_google():
        data = request.get_json()
        google_token = data.get("token")

        if not google_token:
            return jsonify({"error": "No token provided"}), 400

        try:
            r = requests.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {google_token}"},
                timeout=10
            )
            
            if r.status_code != 200:
                return jsonify({"error": "Invalid or expired token"}), 401

            google_user = r.json()
            db = get_db()
            
            user = db.users.find_one({"id": google_user["id"]})
            
            if not user:
                user_data = {
                    "id": google_user["id"],
                    "email": google_user["email"],
                    "name": google_user["name"],
                    "picture": google_user.get("picture", ""),
                    "created_at": datetime.utcnow(),
                    "last_login": datetime.utcnow(),
                    "provider": "google"
                }
                result = db.users.insert_one(user_data)
                user_data["_id"] = str(result.inserted_id)
                user = user_data
            else:
                db.users.update_one(
                    {"_id": user["_id"]},
                    {
                        "$set": {
                            "last_login": datetime.utcnow(),
                            "name": google_user["name"],
                            "picture": google_user.get("picture", "")
                        }
                    }
                )
                user["_id"] = str(user["_id"])
                user["name"] = google_user["name"]
                user["picture"] = google_user.get("picture", "")

            token_data = {
                "id": str(user["_id"]),
                "sub": user["id"], 
                "email": user["email"],
                "name": user["name"]
            }
            token = create_access_token(token_data)

            return jsonify({
                "user": {
                    "id": user["_id"],
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "picture": user.get("picture", "")
                },
                "token": token
            })
            
        except requests.RequestException as e:
            return jsonify({"error": f"Error authenticating with Google: {str(e)}"}), 500
        except Exception as e:
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    @app.route("/api/auth/is-valid-token", methods=["POST"])
    def is_valid_token():
        data = request.get_json()
        if not data or 'token' not in data:
            return jsonify({"valid": False, "error": "Token is required"}), 400
            
        token = data.get("token")
        if not token:
            return jsonify({"valid": False, "error": "Token cannot be empty"}), 400
            
        try:
            validate_token(token.removeprefix("Bearer ").strip())
        except Exception as e:
            return jsonify({"valid": False, "error": str(e)}), 401
        return jsonify({"valid": True}), 200
        
