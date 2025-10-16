import React, { useState, useEffect } from "react";
import SignInPage from "./features/signInPage";
import MainPage from "./features/mainPage";
import { getWithAuth } from "./api/base";
import {
  Avatar,
  Box,
  Button,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Navbar from "./components/navbar";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { NavItem } from "./types";
import Profile from "./features/profile";
import CenteredCircularProgress from "./components/centeredCircularProgress";
import { removeAuth } from "./api/auth";

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

  const handleLogout = async () => {
    try {
      await removeAuth();
      if (typeof chrome !== "undefined" && chrome.identity?.clearAllCachedAuthTokens) {
        await new Promise<void>((resolve) => {
          try {
            chrome.identity.clearAllCachedAuthTokens(() => resolve());
          } catch (err) {
            console.error("Error clearing cached auth tokens:", err);
            resolve();
          }
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setUser(false);
      setNavDisabled(true);
      setActive("home");
      setAttentionItems({
        home: false,
        history: false,
        profile: false,
      });
    }
  };

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
        return <MainPage isAuthenticated={!!user} />;
      case "history":
        return <div>History</div>;
      case "profile":
        return <Profile setAttentionItem={setAttentionItem} />;
      default:
        return <MainPage isAuthenticated={!!user} />;
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          overflow: "hidden",
          backdropFilter: "blur(8px)",
        }}
      >
        <Box
          sx={{
            background:
              "linear-gradient(135deg, rgba(63,81,181,0.95), rgba(30,136,229,0.9))",
            color: "white",
            px: 3,
            py: 2.5,
            boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                Jobmate AI
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Generate tailored cover letters directly from job listings.
              </Typography>
            </Box>
            <Tooltip
              title={
                user
                  ? "You are signed in. Logout to switch accounts."
                  : "Sign in to unlock AI-powered cover letters."
              }
            >
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  width: 44,
                  height: 44,
                  fontWeight: 600,
                }}
              >
                {user ? "✓" : "?"}
              </Avatar>
            </Tooltip>
          </Stack>
        </Box>

        <Box sx={{ px: 3, pt: 3 }}>
          <Navbar
            navItems={navItems}
            active={active}
            attentionItems={attentionItems}
            onClick={handleNavbarClick}
            disabled={navDisabled}
          />
        </Box>

        {user && (
          <Box sx={{ px: 3, pb: 0.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{
                alignSelf: "flex-end",
                borderRadius: 2,
                textTransform: "none",
              }}
            >
              Logout
            </Button>
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            px: 3,
            pb: 3,
            pt: user ? 1 : 0,
            overflowY: "auto",
            backgroundColor: "#f9fafc",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              overflow: "hidden",
            }}
          >
            {user ? (
              renderPage()
            ) : (
              <SignInPage setAttentionItem={setAttentionItem} />
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
