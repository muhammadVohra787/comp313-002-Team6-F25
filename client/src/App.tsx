import React, { useState, useEffect } from "react";
import SignInPage from "./features/signInPage";
import MainPage from "./features/mainPage";
import { getWithAuth } from "./api/base";
import { CircularProgress } from "@mui/material";

export default function App() {
  const [user, setUser] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getWithAuth("/auth/is-valid-token");
        console.log("Token validation response:", response);
        setUser(response.valid === true);
      } catch (error) {
        console.error("Error in isUserLoggedIn:", error);
        setUser(false);
      }
    };

    checkAuth();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "local" && changes.auth) {
        const hasToken = !!changes.auth.newValue?.token;
        setUser(hasToken);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (user === null) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </div>
    );
  }

  return <div>{user ? <MainPage /> : <SignInPage />}</div>;
}
