import { AuthResponse } from "../models/userModel";
import { apiPost } from "./base";

// -----------------------------
// Type definition
// -----------------------------
// Represents the stored authentication data in Chrome local storage.
// It will either contain a valid AuthResponse or be null.
export type StoredAuth = AuthResponse | null;

// -----------------------------
// Retrieve auth data
// -----------------------------
export async function getAuthData(): Promise<StoredAuth> {
  // Get "auth" object from Chrome's local storage
  // and return null if it doesn’t exist
  return new Promise((resolve) => {
    chrome.storage.local.get("auth", (result) => {
      resolve(result.auth ?? null);
    });
  });
}

// -----------------------------
// Save auth data
// -----------------------------
export async function setAuthData(authResponse: AuthResponse): Promise<void> {
  // Save authentication info (token, user, etc.)
  // into Chrome’s local storage for later use
  await chrome.storage.local.set({ auth: authResponse });
}

// -----------------------------
// Remove auth data
// -----------------------------
export async function removeAuth(): Promise<void> {
  // Clear authentication info from local storage
  // (used when user logs out)
  await chrome.storage.local.remove("auth");
}
