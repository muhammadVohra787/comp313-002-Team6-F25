from flask import Flask
from flask_cors import CORS
from routes.health.routes import init_health_routes
from routes.auth.routes import init_auth_routes
from routes.cover_letter.routes import init_cover_letter_routes
from routes.profile.routes import init_profile_routes
from routes.history.routes import init_history_routes

app = Flask(__name__)
CORS(app)

init_health_routes(app)
init_auth_routes(app)
init_cover_letter_routes(app)
init_profile_routes(app)
init_history_routes(app)

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
