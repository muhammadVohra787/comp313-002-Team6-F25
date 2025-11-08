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

# Environment variables and constants
JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
JWT_ALGORITHM = 'HS256'
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
ALLOW_PROFILE_FALLBACK = os.getenv("ALLOW_PROFILE_FALLBACK", "true").lower() == "true"

def _serialize_document(value):
    """
    Convert MongoDB-specific data types (like ObjectId)
    into regular JSON-serializable types (string, dict, list).
    """
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [_serialize_document(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_document(val) for key, val in value.items()}
    return value


def init_auth_routes(app):
    # ---------------- GOOGLE AUTH ROUTE ----------------
    @app.route("/api/auth/google", methods=["POST"])
    def auth_google():
        # Receive Google token and optional profile info from client
        data = request.get_json()
        google_token = data.get("token")
        provided_profile = data.get("profile")

        # Token is required to authenticate
        if not google_token:
            return jsonify({"error": "No token provided"}), 400

        try:
            # Step 1: Verify Google token and retrieve user info
            google_user = None
            verification_error = None

            try:
                # Send token to Google's userinfo endpoint for validation
                r = requests.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {google_token}"},
                    timeout=10
                )
                if r.status_code == 200:
                    google_user = r.json()  # Valid token, extract user info
                else:
                    verification_error = f"Google userinfo responded with status {r.status_code}"
            except requests.RequestException as verify_exc:
                verification_error = str(verify_exc)

            # If Google verification fails, use fallback profile if allowed
            if google_user is None:
                if provided_profile and ALLOW_PROFILE_FALLBACK:
                    google_user = provided_profile
                else:
                    if verification_error:
                        return jsonify({"error": f"Unable to verify Google token: {verification_error}"}), 401
                    return jsonify({"error": "Unable to verify Google token"}), 401

            # Ensure required profile info exists
            if not google_user.get("id") or not google_user.get("email"):
                return jsonify({"error": "Google profile information incomplete"}), 400

            # Step 2: Connect to database and check if user exists
            db = get_db()
            user = db.users.find_one({"google_id": google_user["id"]})
            if user:
                user = _serialize_document(user)

            # Step 3: Create a new user if not found
            if not user:
                user_data = {
                    "google_id": google_user["id"],  # Store Google user ID
                    "email": google_user["email"],
                    "name": google_user["name"],
                    "picture": google_user.get("picture", ""),
                    "city": None,
                    "country": None,
                    "postal_code": None,
                    "personal_prompt": None,
                    "attention_needed": True,
                }
                # Insert new user into database
                result = db.users.insert_one(user_data)
                user_data["_id"] = str(result.inserted_id)
                user = user_data
            else:
                user["_id"] = str(user["_id"])

            # Step 4: Generate JWT access token for the user
            token_data = {
                "id": str(user["_id"]),
                "sub": str(user["_id"]),
                "email": user["email"],
                "name": user["name"]
            }
            token = create_access_token(token_data)

            # Step 5: Prepare response with user info and token
            user_response = _serialize_document({
                **user,
                "id": user["_id"],       
                "google_id": user.get("google_id")
            })
            user_response.pop("_id", None)

            # Return user info and generated token to frontend
            return jsonify({
                "user": user_response,
                "token": token
            })

        # Handle network issues (Google or MongoDB)
        except requests.RequestException as e:
            return jsonify({"error": f"Error authenticating with Google: {str(e)}"}), 500
        
        # Handle unexpected internal errors
        except Exception as e:
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    

    # ---------------- TOKEN VALIDATION ROUTE ----------------
    @app.route("/api/auth/is-valid-token", methods=["GET"])
    def is_valid_token():
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"valid": False, "error": "Token cannot be empty"}), 400
            
        try:
            # Validate JWT using helper function
            validate_token(token.removeprefix("Bearer ").strip())
        except Exception as e:
            # Token is invalid or expired
            return jsonify({"valid": False, "error": str(e)}), 401
        
        # Token is valid
        return jsonify({"valid": True}), 200