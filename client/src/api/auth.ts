// api/auth.ts
import { GoogleUserInfo } from "../models/userModel";
import { apiPost, getWithAuth } from "./base";

export const authenticateGoogleToken = async (token: string) => {
    const response = await apiPost("/auth/google", { token });
    if (window.JobMateAuth) {
        await window.JobMateAuth.setAuthData(response.user, response.token);
    }
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

export const getAuthData = () => {
    return window.JobMateAuth?.getAuthData() || Promise.resolve(null);
};

export const setAuthData = (user: GoogleUserInfo, token: string) => {
    return window.JobMateAuth?.setAuthData(user, token) || Promise.resolve();
};

export const removeAuth = () => {
    return window.JobMateAuth?.removeAuthData() || Promise.resolve();
};
