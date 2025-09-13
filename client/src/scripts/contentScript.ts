import { detectJobSite, trimHtml } from "../utils/scrapeHelpers";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SCRAPE_PAGE") {
    try {
      console.log("Scraping page HTML...");
      const bodyElement = document.body;
      const jobSite = detectJobSite(window.location.href);

      const cleanText = trimHtml(bodyElement, jobSite);
      console.log("Extracted clean text length:", cleanText);

      sendResponse({ success: true, html: cleanText });
    } catch (err) {
      console.error("Scrape error:", err);
      sendResponse({ success: false, error: (err as Error).message });
    }

    return true;
  }
});
