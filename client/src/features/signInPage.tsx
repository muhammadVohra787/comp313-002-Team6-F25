//features/authentication.tsx
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
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { removeAuth, setAuthData } from "../api/auth";
import { apiPost } from "../api/base";
import { AuthResponse } from "../models/userModel";
import { SetAttentionItem } from "../types";

export default function SignInPage({
  setAttentionItem,
}: {
  setAttentionItem: SetAttentionItem;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const token = await new Promise<string>((resolve, reject) => {
        try {
          chrome.identity.getAuthToken({ interactive: true }, (t: any) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!t) return reject(new Error("No token received from Google"));

            if (typeof t === "string") return resolve(t);
            if (typeof t === "object" && typeof t.token === "string") {
              return resolve(t.token);
            }
            return reject(
              new Error("Unexpected token shape from chrome.identity")
            );
          });
        } catch (e: any) {
          reject(e);
        }
      });

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

      const response: AuthResponse = await apiPost("/auth/google", {
        token,
        profile,
      });

      await setAuthData(response);
      setAttentionItem("profile", response.user.attention_needed);
    } catch (err: any) {
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
          "radial-gradient(circle at top, rgba(129,140,248,0.08), transparent 45%), #ffffff",
      }}
    >
      <Stack
        spacing={3}
        sx={{
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Welcome to Jobmate AI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Connect with Google to sync your history and generate tailored cover
            letters in seconds.
          </Typography>
        </Box>

        <List dense sx={{ textAlign: "left" }}>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <CheckCircleIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Secure Google authentication with one click." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AutoAwesomeIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="AI-crafted cover letters that match each job." />
          </ListItem>
          <ListItem disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LockOpenIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Instant access to your preferences and resume." />
          </ListItem>
        </List>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleLogin}
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            py: 1.2,
            boxShadow: "0 8px 20px rgba(66, 133, 244, 0.25)",
          }}
        >
          {loading ? "Signing you in..." : "Continue with Google"}
        </Button>
      </Stack>
    </Box>
  );
}
