import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { removeAuth, setAuthData } from "../api/auth";
import { apiPost } from "../api/base";
import { AuthResponse } from "../models/userModel";
import { SetAttentionItem } from "../types";
import { getGoogleAccessToken } from "../utils/googleIdentity";

export default function SignInPage({
  setAttentionItem,
}: {
  setAttentionItem: SetAttentionItem;
}) {
  // loading state for button and auth flow
  const [loading, setLoading] = useState(false);
  // error message from Google or backend
  const [error, setError] = useState<string>("");

  // Main Google sign-in flow
  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // 1. Get Google OAuth access token
      const token = await getGoogleAccessToken(true);

      
      // 2. (Optional) Try to fetch Google profile directly from Google
      // so we can send it to our backend as fallback
      let profile: Record<string, any> | undefined;
      try {
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (userInfoResponse.ok) {
          profile = await userInfoResponse.json();
        } else {
          const errorText = await userInfoResponse.text();
          console.warn("Failed to retrieve Google profile:", errorText);
        }
      } catch (profileErr) {
        console.warn("Unable to fetch Google user profile", profileErr);
      }

      // 3. Send token (and profile if available) to our backend
      // to create or find the user and return our own JWT
      const response: AuthResponse = await apiPost("/auth/google", {
        token,
        profile,
      });

      // 4. Save auth in extension storage so other pages can use it
      await setAuthData(response);

      // 5. Update attention flag (profile incomplete, no resume, etc.)
      setAttentionItem("profile", response.user.attention_needed);
    } catch (err: any) {
      // if anything fails, clear local auth and show error
      await removeAuth();
      const msg = err?.message || "Login failed";
      console.error("Login error:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 4,
        py: 3,
        background:
          "radial-gradient(circle at top right, rgba(79, 70, 229, 0.05), transparent 70%)",
      }}
    >
      <Fade in timeout={600}>
        <Stack
          spacing={3}
          sx={{
            width: "100%",
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          {/* Logo / hero icon */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 1,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "20px",
                background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 30px rgba(79, 70, 229, 0.3)",
                animation: "float 3s ease-in-out infinite",
                "@keyframes float": {
                  "0%, 100%": { transform: "translateY(0px)" },
                  "50%": { transform: "translateY(-10px)" },
                },
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 40, color: "white" }} />
            </Box>
          </Box>

          {/* Title + subtitle */}
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Welcome to Jobmate AI
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              Connect with Google to sync your history and generate tailored
              cover letters in seconds
            </Typography>
          </Box>

          {/* Quick feature list */}
          <List
            dense
            sx={{
              textAlign: "left",
              bgcolor: "rgba(248, 250, 252, 0.6)",
              borderRadius: 2.5,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <ListItem disableGutters sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Secure Google authentication"
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <AutoAwesomeIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="AI-crafted cover letters"
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.75 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LockOpenIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Access to your preferences"
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              />
            </ListItem>
          </List>

          {/* Error from login/backend */}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  borderRadius: 2.5,
                  "& .MuiAlert-message": {
                    width: "100%",
                  },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Google sign-in button */}
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GoogleIcon />
              )
            }
            onClick={handleLogin}
            disabled={loading}
            sx={{
              borderRadius: 2.5,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(79, 70, 229, 0.3)",
              background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
              "&:hover": {
                boxShadow: "0 12px 32px rgba(79, 70, 229, 0.4)",
                transform: "translateY(-2px)",
              },
              "&:disabled": {
                background: "rgba(148, 163, 184, 0.3)",
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          >
            {loading ? "Signing you in..." : "Continue with Google"}
          </Button>
        </Stack>
      </Fade>
    </Box>
  );
}
