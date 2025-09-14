//utils/contentListeners.ts

export async function requestPageHTML(): Promise<string> {
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
}

export function loginWithGoogle(): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "LOGIN" }, (response) => {
            console.log("Login response:", response);
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            if (response?.error) {
                console.error(response.error);
                reject(new Error(response.error));
                return;
            }

            const token = response?.token;
            if (!token) {
                reject(new Error('No token received'));
                return;
            }

            console.log("Access token:", response);
            resolve();
        });
    });
}