import { AuthResponse } from "../models/userModel";
import { apiPost } from "./base";

// -----------------------------
// Type definition
// -----------------------------
// Represents the stored authentication data in Chrome local storage.
// It will either contain a valid AuthResponse or be null.
export type StoredAuth = AuthResponse | null;

let inMemoryAuth: StoredAuth = null;

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== "undefined" &&
    !!chrome.storage &&
    !!chrome.storage.local
  );
}

function hasWindowLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

// -----------------------------
// Retrieve auth data
// -----------------------------
export async function getAuthData(): Promise<StoredAuth> {
  // Get "auth" object from Chrome's local storage
  // and return null if it doesn’t exist
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get("auth", (result) => {
        resolve(result.auth ?? null);
      });
    });
  }

  if (hasWindowLocalStorage()) {
    try {
      const raw = window.localStorage.getItem("auth");
      if (!raw) return null;
      return JSON.parse(raw) as StoredAuth;
    } catch {
      return null;
    }
  }

  return inMemoryAuth;
}

// -----------------------------
// Save auth data
// -----------------------------
export async function setAuthData(authResponse: AuthResponse): Promise<void> {
  // Save authentication info (token, user, etc.)
  // into Chrome’s local storage for later use
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ auth: authResponse });
    inMemoryAuth = authResponse;
    return;
  }

  if (hasWindowLocalStorage()) {
    try {
      window.localStorage.setItem("auth", JSON.stringify(authResponse));
    } catch {
      // ignore
    }
    inMemoryAuth = authResponse;
    return;
  }

  inMemoryAuth = authResponse;
}

// -----------------------------
// Remove auth data
// -----------------------------
export async function removeAuth(): Promise<void> {
  // Clear authentication info from local storage
  // (used when user logs out)
  if (hasChromeStorage()) {
    await chrome.storage.local.remove("auth");
  }

  if (hasWindowLocalStorage()) {
    try {
      window.localStorage.removeItem("auth");
    } catch {
      // ignore
    }
  }

  inMemoryAuth = null;
}
