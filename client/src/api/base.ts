import { getAuthData } from "./auth";

const API_BASE = `${import.meta.env.VITE_API_URL}/api` || "http://localhost:5000"

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

  if (!response.ok) {
    const errorText = await response.text();  // read ONCE
    throw new Error(errorText || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function multipartPostWithAuth(
  endpoint: string,
  body: any,
  extraHeaders?: Record<string, string>
) {
  const token = await getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      // Note: browser will set multipart/form-data boundary automatically
      Authorization: `Bearer ${token}`,
      ...(extraHeaders || {}),
    },
    body,
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

// -----------------------------
// DELETE request with auth
// -----------------------------
async function deleteWithAuth(endpoint: string) {
  const token = await getToken();
  if (!token) throw new Error("Missing auth token");

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DELETE ${endpoint} failed: ${response.status}${text ? ` - ${text}` : ""}`);
  }

  return response.json();
}

// Export reusable API functions for use across the extension
export {
  getWithAuth,
  postWithAuth,
  apiPost,
  multipartPostWithAuth,
  multipartGetWithAuth,
  deleteWithAuth,
};
