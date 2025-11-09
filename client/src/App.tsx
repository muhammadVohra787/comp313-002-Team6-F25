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
  Fade,
} from "@mui/material";
import Navbar from "./components/navbar";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
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
        return (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              History Coming Soon
            </Typography>
          </Box>
        );
      case "profile":
        return <Profile setAttentionItem={setAttentionItem} onLogout={handleLogout} />;
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
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.12)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
            color: "white",
            px: 3,
            py: 2.5,
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              pointerEvents: "none",
            },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                Jobmate AI
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.95,
                  fontSize: "0.875rem",
                }}
              >
                Generate tailored cover letters from job listings
              </Typography>
            </Box>
            <Tooltip
              title={
                user
                  ? "Signed in successfully"
                  : "Sign in to unlock features"
              }
              arrow
            >
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  width: 48,
                  height: 48,
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    bgcolor: "rgba(255,255,255,0.25)",
                  },
                }}
              >
                {user ? "✓" : "?"}
              </Avatar>
            </Tooltip>
          </Stack>
        </Box>

        {/* Navigation */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Navbar
            navItems={navItems}
            active={active}
            attentionItems={attentionItems}
            onClick={handleNavbarClick}
            disabled={navDisabled}
          />
        </Box>

        {/* Logout Button */}
        {/* {user && (
          <Fade in={user}>
            <Box sx={{ px: 3, pb: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  borderRadius: 2.5,
                  px: 2,
                  py: 0.75,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: "error.main",
                    color: "error.main",
                    bgcolor: "rgba(239, 68, 68, 0.04)",
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          </Fade>
        )} */}

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            px: 0,
            pb: 0,
            pt: 0,
            overflowY: "auto",
          }}
        >
          <Fade in timeout={400}>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                bgcolor: "background.paper",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
              }}
            >
              {user ? (
                renderPage()
              ) : (
                <SignInPage setAttentionItem={setAttentionItem} />
              )}
            </Box>
          </Fade>
        </Box>
      </Paper>
    </Box>
  );
}