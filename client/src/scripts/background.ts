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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SAVE_AUTH") {
        chrome.storage.local.set({ auth: { user: msg.user, token: msg.token } });
    } else if (msg.type === "GET_AUTH") {
        chrome.storage.local.get("auth", (result) => sendResponse(result));
        return true;
    } else if (msg.type === "LOGOUT") {
        chrome.storage.local.remove("auth");
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setAuthData') {
        chrome.storage.local.set({ auth: { user: request.user, token: request.token } }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'getAuthData') {
        chrome.storage.local.get('auth', (result) => {
            sendResponse({ auth: result.auth });
        });
        return true;
    }

    if (request.action === 'removeAuthData') {
        chrome.storage.local.remove('auth', () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get('auth', (result) => {
        if (!result.auth) {
            chrome.storage.local.set({ auth: null });
        }
    });
});