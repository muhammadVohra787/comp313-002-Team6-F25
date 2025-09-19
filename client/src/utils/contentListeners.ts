//utils/contentListeners.ts

import { AuthToken, GoogleUserInfo } from "../models/userModel";
import { authenticateGoogleToken } from "../api/auth";

// Export the requestPageHTML function
export const requestPageHTML = function (): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) return reject(new Error("No active tab"));

            chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PAGE" }, (response) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                if (response?.success) resolve(response.html);
                else reject(new Error(response?.error || "Failed to scrape page"));
            });
        });
    });
};

// Also keep it on window for backward compatibility if needed
window.requestPageHTML = requestPageHTML;

// Export loginWithGoogle function
export const loginWithGoogle = async (): Promise<{ token: string }> => {
    try {
        // 1. Get Google token
        const googleToken = await new Promise<any>((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (!token) {
                    reject(new Error('No token received from Google'));
                    return;
                }
                resolve(token);
            });
        });

        // 2. Authenticate with your backend
        const response = await fetch('http://localhost:5000/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });

        if (!response.ok) {
            throw new Error('Failed to authenticate with backend');
        }

        const { user, token } = await response.json();

        // 3. Store the auth data
        if (window.JobMateAuth) {
            await window.JobMateAuth.setAuthData(user, token);
        }

        return { token };
    } catch (error) {
        console.error('Google login failed:', error);
        if (window.JobMateAuth) {
            await window.JobMateAuth.removeAuthData();
        }
        throw error;
    }
};
window.loginWithGoogle = loginWithGoogle;

// Export the auth utilities
window.JobMateAuth = window.JobMateAuth || {
    setAuthData: async function (user: GoogleUserInfo, token: string): Promise<void> {
        await chrome.runtime.sendMessage({ action: 'setAuthData', user, token });
    },
    getAuthData: async function (): Promise<{ auth: { user: GoogleUserInfo; token: string } } | null> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: 'getAuthData' },
                (response) => resolve(response || null)
            );
        });
    },
    removeAuthData: async function (): Promise<void> {
        await chrome.runtime.sendMessage({ action: 'removeAuthData' });
    }
};
