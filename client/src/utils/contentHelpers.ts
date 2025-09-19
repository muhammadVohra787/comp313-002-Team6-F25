// Content helpers

import { postWithAuth } from "../api/base";

export async function getPageHTML(): Promise<string> {
    return new Promise(async (resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) return reject(new Error("No active tab found"));

            chrome.tabs.sendMessage(
                tab.id,
                { type: "SCRAPE_PAGE" },
                async (response) => {
                    if (chrome.runtime.lastError) {
                        return reject(new Error(chrome.runtime.lastError.message));
                    }
                    if (response?.success) {
                        const result = await postWithAuth("/cover-letter", response?.payload);
                        console.log(result)
                        resolve(result.html);
                    }
                    else reject(new Error(response?.error || "Scraping failed"));
                }
            );
        });
    });
}