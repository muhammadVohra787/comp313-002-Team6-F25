import { processTheJob } from "../api/main";
import { JobDescription } from "../models/coverLetter";
import { GoogleUserInfo } from "../models/userModel";
import { buildPayload } from "../utils/scrapeHelpers";

// Initialize our global functions
window.JobMateAuth = window.JobMateAuth || {
  setAuthData: function (user: GoogleUserInfo, token: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'setAuthData', user, token },
        () => resolve()
      );
    });
  },
  getAuthData: function (): Promise<{ auth: { user: GoogleUserInfo; token: string } } | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getAuthData' },
        (response) => resolve(response || null)
      );
    });
  },
  removeAuthData: function (): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'removeAuthData' },
        () => resolve()
      );
    });
  }
};

// Add requestPageHTML to window
window.requestPageHTML = function (): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return reject(new Error("No active tab"));

      chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PAGE" }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response?.success) resolve(response.html);
        else reject(new Error(response?.error || "Failed to scrape page"));
      });
    });
  });
};

// Message listener for content script functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SCRAPE_PAGE") {
    (async () => {
      try {
        console.log("Scraping page HTML...");
        const bodyElement = document.body;
        const payload = buildPayload(window.location.href, bodyElement);
        const response = await processTheJob(payload);
        sendResponse({ success: true, html: response });
      } catch (err) {
        console.error("Scrape error:", err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    })();
    return true;
  }
});
