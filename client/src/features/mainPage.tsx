import { postWithAuth } from "../api/base";
import Navbar from "../components/navbar";
import { useState } from "react";

export default function MainPage() {
  const [active, setActive] = useState<string>("home");
  const [attentionItems, setAttentionItems] = useState<{
    [key: string]: boolean;
  }>({
    home: false,
    history: false,
    profile: false,
  });

  const handleScrape = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
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
              const result = await postWithAuth(
                "/cover-letter",
                response.payload
              );
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

  const handleNavbarClick = (id: string) => {
    setActive(id);
  };

  const setAttentionItem = (id: string) => {
    setAttentionItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // To be used when we want to switch pages
  // const renderPage = () => {
  //   switch (active) {
  //     case "home":
  //       return <Home />;
  //     case "history":
  //       return <History />;
  //     case "profile":
  //       return <Profile />;
  //     default:
  //       return <Home />;
  //   }
  // };

  return (
    <div>
      <Navbar
        active={active}
        attentionItems={attentionItems}
        onClick={handleNavbarClick}
      />
      <button onClick={handleScrape}>Scrape info now</button>
    </div>
  );
}
