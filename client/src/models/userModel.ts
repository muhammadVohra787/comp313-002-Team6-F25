// -----------------------------
// User model interface
// -----------------------------
// Represents the structure of a user object stored in MongoDB
// and used throughout the frontend application.
export interface User {
  id: string; // MongoDB _id as a string
  google_id: string; // Unique Google account ID
  name: string; // Full name of the user
  email: string; // User's Google email address
  picture: string; // Profile picture URL from Google
  personal_prompt: string | null; // Optional: saved custom prompt for cover letter generation
  attention_needed: boolean; // Flag indicating if user profile requires attention (e.g., missing resume or fields)

  // Resume details if uploaded
  resume: {
    file_name: string; // Original uploaded file name
    text: string; // Extracted resume text content
    id: string; // Resume document ID from database
  } | null;

  // Location and contact info
  city: string | null;
  country: string | null;
  postal_code: string | null;
}

// -----------------------------
// Authentication response model
// -----------------------------
// Returned from backend after successful Google login.
// Contains both the access token and user details.
export interface AuthResponse {
  token: string; // JWT access token used for authenticated requests
  user: User; // Authenticated user profile
}
