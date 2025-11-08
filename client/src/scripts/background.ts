// -----------------------------
// Background Script
// -----------------------------
// This script runs in the background of the Chrome extension.
// It listens for messages (e.g., "LOGIN") and handles actions that
// require Chrome APIs, such as requesting Google authentication tokens.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle login requests from other parts of the extension (e.g., popup)
  if (message.type === "LOGIN") {
    // Request a Google OAuth token using Chrome Identity API
    // "interactive: true" prompts the user to log in if needed
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      // Handle errors returned by the Chrome runtime
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }

      // If no token was returned, report an error
      if (!token) {
        sendResponse({ error: "No token received" });
        return;
      }

      // Successfully return token to the sender
      sendResponse({ token });
    });

    // Return true to keep the message channel open for async response
    return true;
  }
});
