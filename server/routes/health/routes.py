from flask import jsonify
from config.database import get_db

def init_health_routes(app):
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        db = get_db()
        try:
            # Test the database connection
            db.command('ping')
            mongo_connected = True
        except:
            mongo_connected = False
            
        return jsonify({
            'status': 'healthy',
            'message': 'Server is running',
            'mongo_connected': mongo_connected
        }), 200
