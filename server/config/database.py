from pymongo import MongoClient
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Database:
    _instance = None
    _client = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._initialize()
        return cls._instance

    @classmethod
    def _initialize(cls):
        MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        DB_NAME = 'jobmate_db'
        
        try:
            cls._client = MongoClient(MONGO_URI)
            cls._db = cls._client[DB_NAME]
            cls._client.admin.command('ping')
            print("Successfully connected to MongoDB!")
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            raise

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls._initialize()
        return cls._db

    @classmethod
    def close_connection(cls):
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None

# Global instance
db_instance = Database()

def get_db():

    return db_instance.get_db()
