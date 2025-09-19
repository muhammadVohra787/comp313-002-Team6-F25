import os
import jwt
import datetime
from functools import wraps
from flask import jsonify, request
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'your-256-bit-secret')
JWT_ALGORITHM = 'HS256'
# 7 days token
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 7

__all__ = ['create_access_token', 'token_required', 'JWT_SECRET', 'JWT_ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES']

def create_access_token(user_data: dict) -> str:
    """Create a JWT access token with user data"""
    to_encode = user_data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        'exp': expire,
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_data.get('id', user_data.get('sub', '')))
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def token_required(f):
    """Decorator to protect routes that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def validate_token(token: str) -> None:
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        raise Exception("Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"Invalid token: {str(e)}")
        raise Exception("Invalid token")
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise Exception("Token validation failed")