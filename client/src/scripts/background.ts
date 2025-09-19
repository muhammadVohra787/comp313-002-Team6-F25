//scripts/background.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "LOGIN") {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            if (!token) {
                sendResponse({ error: "No token received" });
                return;
            }
            sendResponse({ token });
        });

        return true;
    }
});
