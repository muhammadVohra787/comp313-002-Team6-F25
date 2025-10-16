// api/auth.ts
import { AuthResponse } from "../models/userModel";
import { apiPost } from "./base";

export const getAuthData = async () => {
    return await chrome.storage.local.get('auth');
};

export const setAuthData = async (authResponse: AuthResponse) => {
    await chrome.storage.local.set({ auth: authResponse });
};

export const removeAuth = async () => {
    await chrome.storage.local.remove('auth');
};

