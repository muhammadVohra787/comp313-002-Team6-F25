// -----------------------------
// Content Script
// -----------------------------
// Runs in the context of the web page being viewed (e.g., LinkedIn, Indeed, etc.)
// Listens for messages from the Chrome extension (popup or background script)
// and extracts job details from the current page when requested.

import { buildPayload } from "../utils/scrapeHelpers";
import { JobDescription } from "../models/coverLetter";

// Listen for messages sent from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle the custom "SCRAPE_PAGE" message to extract job info
  if (request.type === "SCRAPE_PAGE") {
    (async () => {
      try {
        // Access the main HTML body of the current tab
        const bodyElement = document.body;

        // Use helper function to build the structured job payload
        // Includes URL, job description, title, company, etc.
        const payload: JobDescription = buildPayload(
          window.location.href,
          bodyElement
        );

        // Successfully return job details to the sender (popup script)
        sendResponse({ success: true, payload });
      } catch (err) {
        // Send error back if scraping fails
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    })();

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
