# JobMate AI - Backend Server

This is the backend server for the JobMate AI application, built with Flask and MongoDB.

## Prerequisites

- Python 3.8 or higher
- MongoDB (local or remote)
- pip (Python package manager)

## Setup

1. **Create and activate a virtual environment**

   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the environment variables in `.env` as needed

## Running the Server

### Development Mode

```bash
# Make sure you're in the server directory
cd server

# Run the Flask development server
python app.py
```

The server will start at `http://localhost:5000`

### Production Mode

For production, it's recommended to use Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/example` - Example endpoint

## Database

This application uses MongoDB. Make sure you have MongoDB installed and running locally or update the `MONGO_URI` in the `.env` file to point to your MongoDB instance.
