// api/auth.ts
import { GoogleUserInfo } from "../models/userModel";

const API_URL = "http://localhost:5000/api";

export const authenticateGoogleToken = async (token: string) => {
    const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
    });

    if (!response.ok) {
        throw new Error('Failed to authenticate with Google');
    }

    const data = await response.json();

    if (window.JobMateAuth) {
        await window.JobMateAuth.setAuthData(data.user, data.token);
    }

    return data;
};

export const isUserLoggedIn = async (): Promise<boolean> => {
    try {
        if (!window.JobMateAuth) {
            console.log('JobMateAuth not available');
            return false;
        }

        const authResponse = await window.JobMateAuth.getAuthData();
        console.log('Auth data from storage:', authResponse);

        // Directly use authResponse since it already contains token at the root level
        const token = authResponse?.auth?.token;

        if (!token) {
            console.log('No auth token found');
            return false;
        }

        const response = await fetch(`${API_URL}/auth/is-valid-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            console.log('Token validation failed with status:', response.status);
            throw new Error('Token validation failed');
        }

        const data = await response.json();
        console.log('Token validation response:', data);

        return data.valid === true;
    } catch (error) {
        console.error('Error in isUserLoggedIn:', error);
        if (window.JobMateAuth) {
            await window.JobMateAuth.removeAuthData();
        }
        return false;
    }
};

// Utility functions that can be used throughout the app
export const getAuthData = () => {
    return window.JobMateAuth?.getAuthData() || Promise.resolve(null);
};

export const setAuthData = (user: GoogleUserInfo, token: string) => {
    return window.JobMateAuth?.setAuthData(user, token) || Promise.resolve();
};

export const removeAuth = () => {
    return window.JobMateAuth?.removeAuthData() || Promise.resolve();
};
