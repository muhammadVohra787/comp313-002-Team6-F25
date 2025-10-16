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

JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
JWT_ALGORITHM = 'HS256'

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
ALLOW_PROFILE_FALLBACK = os.getenv("ALLOW_PROFILE_FALLBACK", "true").lower() == "true"


def _serialize_document(value):
    """
    Recursively convert MongoDB-specific types (e.g. ObjectId) into
    JSON-serializable primitives.
    """
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_serialize_document(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_document(val) for key, val in value.items()}
    return value

def init_auth_routes(app):
    @app.route("/api/auth/google", methods=["POST"])
    def auth_google():
        data = request.get_json()
        google_token = data.get("token")
        provided_profile = data.get("profile")

        if not google_token:
            return jsonify({"error": "No token provided"}), 400

        try:
            # 1. Verify token with Google if possible
            google_user = None
            verification_error = None

            try:
                r = requests.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {google_token}"},
                    timeout=10
                )
                if r.status_code == 200:
                    google_user = r.json()
                else:
                    verification_error = f"Google userinfo responded with status {r.status_code}"
            except requests.RequestException as verify_exc:
                verification_error = str(verify_exc)

            if google_user is None:
                if provided_profile and ALLOW_PROFILE_FALLBACK:
                    google_user = provided_profile
                else:
                    if verification_error:
                        return jsonify({"error": f"Unable to verify Google token: {verification_error}"}), 401
                    return jsonify({"error": "Unable to verify Google token"}), 401

            if not google_user.get("id") or not google_user.get("email"):
                return jsonify({"error": "Google profile information incomplete"}), 400

            db = get_db()

            # 2. Check if user exists by google_id
            user = db.users.find_one({"google_id": google_user["id"]})

            if user:
                user = _serialize_document(user)

            # 3. Create new user if needed
            if not user:
                user_data = {
                    "google_id": google_user["id"],  # store provider-specific ID
                    "email": google_user["email"],
                    "name": google_user["name"],
                    "picture": google_user.get("picture", ""),
                    "city": None,
                    "country": None,
                    "postal_code": None,
                    "personal_prompt": None,
                    "attention_needed": True,
                }
                result = db.users.insert_one(user_data)
                user_data["_id"] = str(result.inserted_id)
                user = user_data
            else:
                user["_id"] = str(user["_id"])

            # 4. Generate token using MongoDB _id
            token_data = {
                "id": str(user["_id"]),
                "sub": str(user["_id"]),
                "email": user["email"],
                "name": user["name"]
            }
            token = create_access_token(token_data)

            # 5. Build response
            user_response = _serialize_document({
                **user,
                "id": user["_id"],       
                "google_id": user.get("google_id")
            })
            user_response.pop("_id", None)

            return jsonify({
                "user": user_response,
                "token": token
            })

        except requests.RequestException as e:
            # General network errors when interacting with Mongo or other services
            return jsonify({"error": f"Error authenticating with Google: {str(e)}"}), 500
        except Exception as e:
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    
    @app.route("/api/auth/is-valid-token", methods=["GET"])
    def is_valid_token():
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"valid": False, "error": "Token cannot be empty"}), 400
            
        try:
            validate_token(token.removeprefix("Bearer ").strip())
        except Exception as e:
            return jsonify({"valid": False, "error": str(e)}), 401
        return jsonify({"valid": True}), 200
        
