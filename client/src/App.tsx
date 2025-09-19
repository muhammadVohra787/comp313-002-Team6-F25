import React, { useState, useEffect } from "react";
import SignInPage from "./features/signInPage";
import MainPage from "./features/mainPage";
import { getAuthData } from "./api/auth";

export default function App() {
  const [user, setUser] = useState(false);

  // Fetch initial login state on mount
  useEffect(() => {
    const fetchInitialAuth = async () => {
      try {
        const auth = await getAuthData();
        setUser(!!auth?.token);
      } catch (error) {
        console.error("Failed to fetch auth data:", error);
      }
    };

    fetchInitialAuth();

    // Listen for auth changes in Chrome storage (login/logout elsewhere)
    const handleStorageChange = (changes: any, area: string) => {
      if (area === "local" && changes.auth) {
        setUser(!!changes.auth.newValue?.token);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <div className="w-50 bg-white">
      <p>User is logged in: {user ? "Yes" : "No"}</p>
      {user ? <MainPage /> : <SignInPage />}
    </div>
  );
}
