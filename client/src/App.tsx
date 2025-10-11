import React, { useState, useEffect } from "react";
import SignInPage from "./features/signInPage";
import MainPage from "./features/mainPage";
import { getWithAuth } from "./api/base";
import { Box, CircularProgress } from "@mui/material";
import Navbar from "./components/navbar";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { NavItem } from "./types";
import Profile from "./features/profile";
import CenteredCircularProgress from "./components/centeredCircularProgress";

export default function App() {
  const [user, setUser] = useState<boolean | null>(null);
  const [active, setActive] = useState<string>("home");
  const [attentionItems, setAttentionItems] = useState<{
    [key: string]: boolean;
  }>({
    home: false,
    history: false,
    profile: false,
  });

  const navItems: NavItem[] = [
    { id: "home", label: "Homepage", icon: <HomeIcon /> },
    { id: "history", label: "History", icon: <HistoryIcon /> },
    { id: "profile", label: "Profile", icon: <AccountCircleIcon /> },
  ];

  const [navDisabled, setNavDisabled] = useState<boolean>(true);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getWithAuth("/auth/is-valid-token");
        console.log("Token validation response:", response);
        setUser(!!response.valid);
        setNavDisabled(!response.valid);
      } catch (error) {
        console.error("Error in isUserLoggedIn:", error);
        setUser(false);
        setNavDisabled(true);
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
        setNavDisabled(!hasToken);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (user === null) return <CenteredCircularProgress />;

  const handleNavbarClick = (id: string) => {
    setActive(id);
  };

  const setAttentionItem = (id: string, attention: boolean) => {
    setAttentionItems((prev) => ({
      ...prev,
      [id]: attention,
    }));
  };

  const renderPage = () => {
    switch (active) {
      case "home":
        return <MainPage />;
      case "history":
        return <div>History</div>;
      case "profile":
        return <Profile />;
      default:
        return <MainPage />;
    }
  };

  return (
    <Box sx={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Navbar
        navItems={navItems}
        active={active}
        attentionItems={attentionItems}
        onClick={handleNavbarClick}
        disabled={navDisabled}
      />
      <Box sx={{ flex: 2, overflow: "auto" }}>
        {user ? (
          renderPage()
        ) : (
          <SignInPage setAttentionItem={setAttentionItem} />
        )}
      </Box>
    </Box>
  );
}
