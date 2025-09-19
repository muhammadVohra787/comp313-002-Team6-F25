import { loginWithGoogle } from "../api/auth";
import { getPageHTML } from "../utils/contentHelpers";

export default function MainPage() {
  const handleScrape = async () => {
    try {
      await getPageHTML();
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
    </div>
  );
}
