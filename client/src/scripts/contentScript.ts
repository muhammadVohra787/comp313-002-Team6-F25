// Content script

import { buildPayload } from "../utils/scrapeHelpers";
import { JobDescription } from "../models/coverLetter";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SCRAPE_PAGE") {
    (async () => {
      try {
        const bodyElement = document.body;
        const payload: JobDescription = buildPayload(window.location.href, bodyElement);
        sendResponse({ success: true, payload });
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    })();
    return true;
  }
});