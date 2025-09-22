import { postWithAuth } from "../api/base";

export default function MainPage() {
  const handleScrape = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found");

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tab.id!,
        { type: "SCRAPE_PAGE" },
        async (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (response?.success) {
            try {
              const result = await postWithAuth("/cover-letter", response.payload);
              console.log(result);
              resolve(result.html);
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(response?.error || "Scraping failed"));
          }
        }
      );
    });
  };

  return (
    <div className="p-4 w-80 bg-white">
      <button
        onClick={handleScrape}
        className="bg-gray-200 hover:bg-gray-300 text-black font-semibold p-2 rounded w-full mb-2 transition"
      >
        Scrape info now
      </button>
    </div>
  );
}
