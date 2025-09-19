// api/auth.ts
import { GoogleUserInfo } from "../models/userModel";
import { apiPost, getWithAuth } from "./base";

export const authenticateGoogleToken = async (token: string) => {
    const response = await apiPost("/auth/google", { token });
    await setAuthData(response.user, response.token);
    return response;
};

export const isUserLoggedIn = async (): Promise<boolean> => {
    try {
        const response = await getWithAuth("/auth/is-valid-token");
        console.log('Token validation response:', response);
        return response.valid === true;
    } catch (error) {
        console.error('Error in isUserLoggedIn:', error);
        return false;
    }
};

export const getAuthData = async () => {
    return await chrome.storage.local.get('auth');
};

export const setAuthData = async (user: GoogleUserInfo, token: string) => {
    await chrome.storage.local.set({ auth: { user, token } });
};

export const removeAuth = async () => {
    await chrome.storage.local.remove('auth');
};


export async function loginWithGoogle(): Promise<{ token: string }> {
    try {
        const googleToken = await chrome.identity.getAuthToken({ interactive: true });
        if (!googleToken || !googleToken?.token) throw new Error("No token received from Google");
        const response = await fetch("http://localhost:5000/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: googleToken?.token }),
        });

        if (!response.ok) throw new Error("Failed to authenticate with backend");
        const { user, token } = await response.json();

        await setAuthData(user, token);
        return { token };
    } catch (err) {
        await removeAuth();
        throw err;
    }
}