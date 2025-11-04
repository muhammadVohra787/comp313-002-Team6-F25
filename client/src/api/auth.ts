// // api/auth.ts
// import { AuthResponse } from "../models/userModel";
// import { apiPost } from "./base";

// export const getAuthData = async () => {
//     return await chrome.storage.local.get('auth');
// };

// export const setAuthData = async (authResponse: AuthResponse) => {
//     await chrome.storage.local.set({ auth: authResponse });
// };

// export const removeAuth = async () => {
//     await chrome.storage.local.remove('auth');
// };

import { AuthResponse } from "../models/userModel";
import { apiPost } from "./base";

// Define what comes back from storage
export type StoredAuth = AuthResponse | null;

export async function getAuthData(): Promise<StoredAuth> {
  return new Promise((resolve) => {
    chrome.storage.local.get("auth", (result) => {
      resolve(result.auth ?? null);
    });
  });
}

export async function setAuthData(authResponse: AuthResponse): Promise<void> {
  await chrome.storage.local.set({ auth: authResponse });
}

export async function removeAuth(): Promise<void> {
  await chrome.storage.local.remove("auth");
}
