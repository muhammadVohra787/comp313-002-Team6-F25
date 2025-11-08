import { getAuthData } from "./auth";

const API_BASE = "http://localhost:5000/api"; // Base URL for backend API

// -----------------------------
// Get JWT token from local storage
// -----------------------------
export async function getToken(): Promise<string | null> {
  const authData = await getAuthData();
  if (!authData) return null;
  return authData.token || null;
}

// -----------------------------
// Generic GET request with JWT authorization
// -----------------------------
async function getWithAuth(endpoint: string) {
  const token = await getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${endpoint} failed: ${response.status}`);
  }

  // Return parsed JSON response
  return response.json();
}

// -----------------------------
// Generic POST request with JWT authorization
// (optional tokenOverride for temporary tokens)
// -----------------------------
async function postWithAuth(
  endpoint: string,
  body: any,
  tokenOverride?: string
) {
  const token = tokenOverride || (await getToken());
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // Provide better error visibility
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${endpoint} failed: ${response.status} - ${text}`);
  }

  return response.json();
}

// -----------------------------
// Basic POST request (no auth token required)
// -----------------------------
async function apiPost(endpoint: string, body: any) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Gracefully handle API or text-based error responses
  if (!response.ok) {
    let errorMessage = `POST ${endpoint} failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) errorMessage = data.error;
    } catch (_) {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// -----------------------------
// Multipart POST request (used for file uploads like resumes)
// -----------------------------
async function multipartPostWithAuth(endpoint: string, body: any) {
  const token = await getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      // Note: browser automatically sets proper multipart/form-data headers
      Authorization: `Bearer ${token}`,
    },
    body: body,
  });

  if (!response.ok) {
    throw new Error(`POST ${endpoint} failed: ${response.status}`);
  }

  return response.json();
}

// -----------------------------
// Multipart GET request (used for downloading files)
// -----------------------------
async function multipartGetWithAuth(endpoint: string) {
  const token = await getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      // Let browser set content type
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${endpoint} failed: ${response.status}`);
  }

  // Caller handles raw response (e.g., blob or file stream)
  return response;
}

// Export reusable API functions for use across the extension
export {
  getWithAuth,
  postWithAuth,
  apiPost,
  multipartPostWithAuth,
  multipartGetWithAuth,
};
