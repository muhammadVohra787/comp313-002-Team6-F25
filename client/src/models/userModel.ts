
// User model
export interface User {
    id: string;               // MongoDB _id as string
    google_id: string;        // Google user ID
    name: string;
    email: string;
    picture: string;
    personal_prompt: string | null;
    attention_needed: boolean;
    resume: {
        file_name: string;
        text: string;
        id: string;
    } | null;
    city: string | null;
    country: string | null;
    postal_code: string | null;
}

// Token + User response
export interface AuthResponse {
    token: string;
    user: User;
}