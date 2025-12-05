from flask import jsonify, request, redirect, Response

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
GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")

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
    # ---------------- GOOGLE AUTH REDIRECT FLOW (WEB) ----------------

    @app.route("/auth/google/start", methods=["GET"])
    def auth_google_start():
        if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
            return jsonify({"error": "Google OAuth not configured"}), 500

        state = request.args.get("state", "")

        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "include_granted_scopes": "true",
            "state": state,
            "prompt": "select_account",
        }

        query = "&".join(f"{key}={requests.utils.quote(str(value))}" for key, value in params.items() if value)
        return redirect(f"{GOOGLE_OAUTH_AUTHORIZE_URL}?{query}")

    @app.route("/auth/google/callback", methods=["GET"])
    def auth_google_callback():
        error_param = request.args.get("error")
        if error_param:
            # User cancelled or Google returned an OAuth error. Inform the opener
            # and close the popup so the UI can handle it gracefully.
            import json as _json

            html_error = f"""<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <title>Jobmate AI Login</title>
  </head>
  <body>
    <script>
      (function() {{
        try {{
          var payload = {{ error: {_json.dumps(error_param)} }};
          if (window.opener && !window.opener.closed) {{
            window.opener.postMessage({{ type: 'jobmate-auth-error', payload: payload }}, '*');
          }}
        }} catch (e) {{
          console.error('Error posting auth error', e);
        }} finally {{
          window.close();
        }}
      }})();
    </script>
  </body>
</html>"""

            return Response(html_error, mimetype="text/html")

        code = request.args.get("code")
        if not code:
            return jsonify({"error": "Missing authorization code"}), 400

        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
            return jsonify({"error": "Google OAuth not configured"}), 500

        try:
            # Exchange authorization code for tokens
            token_resp = requests.post(
                GOOGLE_OAUTH_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )

            if token_resp.status_code != 200:
                return jsonify({"error": "Failed to exchange code for tokens"}), 400

            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return jsonify({"error": "No access token returned from Google"}), 400

            # Reuse existing logic below to fetch Google user and create/find local user
            google_user = None
            verification_error = None

            try:
                r = requests.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10,
                )
                if r.status_code == 200:
                    google_user = r.json()
                else:
                    verification_error = f"Google userinfo responded with status {r.status_code}"
            except requests.RequestException as verify_exc:
                verification_error = str(verify_exc)

            if google_user is None:
                if verification_error:
                    return jsonify({"error": f"Unable to verify Google token: {verification_error}"}), 401
                return jsonify({"error": "Unable to verify Google token"}), 401

            if not google_user.get("id") or not google_user.get("email"):
                return jsonify({"error": "Google profile information incomplete"}), 400

            db = get_db()
            user = db.users.find_one({"google_id": google_user["id"]})
            if user:
                user = _serialize_document(user)

            if not user:
                user_data = {
                    "google_id": google_user["id"],
                    "email": google_user["email"],
                    "name": google_user.get("name", ""),
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

            jwt_payload = {
                "id": str(user["_id"]),
                "sub": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
            }
            app_token = create_access_token(jwt_payload)

            user_response = _serialize_document({
                **user,
                "id": user["_id"],
                "google_id": user.get("google_id"),
            })
            user_response.pop("_id", None)

            import json as _json

            # Embed JSON-serialized user and token into a small HTML page that
            # posts a message back to the opener and then closes the popup.
            html = f"""<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <title>Jobmate AI Login</title>
  </head>
  <body>
    <script>
      (function() {{
        try {{
          var payload = {{ user: {_json.dumps(user_response)}, token: {_json.dumps(app_token)} }};
          if (window.opener && !window.opener.closed) {{
            window.opener.postMessage({{ type: 'jobmate-auth', payload: payload }}, '*');
          }}
        }} catch (e) {{
          console.error('Error posting auth result', e);
        }} finally {{
          window.close();
        }}
      }})();
    </script>
  </body>
</html>"""

            return Response(html, mimetype="text/html")

        except requests.RequestException as e:
            return jsonify({"error": f"Error during Google OAuth callback: {str(e)}"}), 500
        except Exception as e:
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    # ---------------- GOOGLE AUTH ROUTE (TOKEN-BASED, EXTENSION) ----------------

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