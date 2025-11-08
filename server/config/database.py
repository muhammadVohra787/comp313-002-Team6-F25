from pymongo import MongoClient
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables from .env file
load_dotenv()

class Database:
    # Singleton instance variables
    _instance = None
    _client = None
    _db = None

    def __new__(cls):
        # Ensure only one instance of Database is created
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._initialize()
        return cls._instance

    @classmethod
    def _initialize(cls):
        # Load MongoDB connection details
        MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        DB_NAME = 'jobmate_db'
        
        try:
            # Connect to MongoDB using the provided URI
            cls._client = MongoClient(MONGO_URI)
            cls._db = cls._client[DB_NAME]

            # Test connection by pinging the server
            cls._client.admin.command('ping')
            print("Successfully connected to MongoDB!")
        except Exception as e:
            # Log and raise error if connection fails
            print(f"Error connecting to MongoDB: {e}")
            raise

    @classmethod
    def get_db(cls):
        # Return database instance (initialize if not already connected)
        if cls._db is None:
            cls._initialize()
        return cls._db

    @classmethod
    def close_connection(cls):
        # Close MongoDB client connection safely
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None

# Create a global database instance
db_instance = Database()

def get_db():
    # Public function to get the MongoDB instance
    return db_instance.get_db()
