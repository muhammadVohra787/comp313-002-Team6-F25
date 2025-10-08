// api/auth.ts
import { GoogleUserInfo } from "../models/userModel";
import { apiPost } from "./base";

export const getAuthData = async () => {
    return await chrome.storage.local.get('auth');
};

export const setAuthData = async (user: GoogleUserInfo, token: string) => {
    await chrome.storage.local.set({ auth: { user, token } });
};

export const removeAuth = async () => {
    await chrome.storage.local.remove('auth');
};

