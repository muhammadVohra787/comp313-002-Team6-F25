import { useState } from "react";
import { loginWithGoogle, requestPageHTML } from "../utils/contentListeners";

export default function MainPage() {
  const handleScrape = async () => {
    try {
      const html = await requestPageHTML();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 w-80 bg-white">
      <button
        onClick={handleScrape}
        className="bg-gray-200 hover:bg-gray-300 text-black font-semibold p-2 rounded w-full mb-2 transition"
      >
        Scrape info now
      </button>
      <button
        onClick={handleLogin}
        className="bg-gray-200 hover:bg-gray-300 text-black font-semibold p-2 rounded w-full mb-2 transition"
      >
        Login with Google
      </button>
    </div>
  );
}
