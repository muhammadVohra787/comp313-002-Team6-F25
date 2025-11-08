// //features/authentication.tsx
// import React, { useState } from "react";
// import {
//   Alert,
//   Box,
//   Button,
//   Stack,
//   Typography,
//   List,
//   ListItem,
//   ListItemIcon,
//   ListItemText,
// } from "@mui/material";
// import GoogleIcon from "@mui/icons-material/Google";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import LockOpenIcon from "@mui/icons-material/LockOpen";
// import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
// import { removeAuth, setAuthData } from "../api/auth";
// import { apiPost } from "../api/base";
// import { AuthResponse } from "../models/userModel";
// import { SetAttentionItem } from "../types";

// export default function SignInPage({
//   setAttentionItem,
// }: {
//   setAttentionItem: SetAttentionItem;
// }) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string>("");

//   const handleLogin = async () => {
//     setError("");
//     setLoading(true);

//     try {
//       const token = await new Promise<string>((resolve, reject) => {
//         try {
//           chrome.identity.getAuthToken({ interactive: true }, (t: any) => {
//             if (chrome.runtime.lastError) {
//               return reject(new Error(chrome.runtime.lastError.message));
//             }
//             if (!t) return reject(new Error("No token received from Google"));

//             if (typeof t === "string") return resolve(t);
//             if (typeof t === "object" && typeof t.token === "string") {
//               return resolve(t.token);
//             }
//             return reject(
//               new Error("Unexpected token shape from chrome.identity")
//             );
//           });
//         } catch (e: any) {
//           reject(e);
//         }
//       });

//       let profile: Record<string, any> | undefined;
//       try {
//         const userInfoResponse = await fetch(
//           "https://www.googleapis.com/oauth2/v2/userinfo",
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           }
//         );

//         if (userInfoResponse.ok) {
//           profile = await userInfoResponse.json();
//         } else {
//           const errorText = await userInfoResponse.text();
//           console.warn("Failed to retrieve Google profile:", errorText);
//         }
//       } catch (profileErr) {
//         console.warn("Unable to fetch Google user profile", profileErr);
//       }

//       const response: AuthResponse = await apiPost("/auth/google", {
//         token,
//         profile,
//       });

//       await setAuthData(response);
//       setAttentionItem("profile", response.user.attention_needed);
//     } catch (err: any) {
//       await removeAuth();
//       const msg = err?.message || "Login failed";
//       console.error("Login error:", err);
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Box
//       sx={{
//         height: "100%",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         px: 4,
//         py: 3,
//         background:
//           "radial-gradient(circle at top, rgba(129,140,248,0.08), transparent 45%), #ffffff",
//       }}
//     >
//       <Stack
//         spacing={3}
//         sx={{
//           width: "100%",
//           maxWidth: 360,
//           textAlign: "center",
//         }}
//       >
//         <Box>
//           <Typography variant="h5" sx={{ fontWeight: 700 }}>
//             Welcome to Jobmate AI
//           </Typography>
//           <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
//             Connect with Google to sync your history and generate tailored cover
//             letters in seconds.
//           </Typography>
//         </Box>

//         <List dense sx={{ textAlign: "left" }}>
//           <ListItem disableGutters>
//             <ListItemIcon sx={{ minWidth: 32 }}>
//               <CheckCircleIcon color="primary" fontSize="small" />
//             </ListItemIcon>
//             <ListItemText primary="Secure Google authentication with one click." />
//           </ListItem>
//           <ListItem disableGutters>
//             <ListItemIcon sx={{ minWidth: 32 }}>
//               <AutoAwesomeIcon color="primary" fontSize="small" />
//             </ListItemIcon>
//             <ListItemText primary="AI-crafted cover letters that match each job." />
//           </ListItem>
//           <ListItem disableGutters>
//             <ListItemIcon sx={{ minWidth: 32 }}>
//               <LockOpenIcon color="primary" fontSize="small" />
//             </ListItemIcon>
//             <ListItemText primary="Instant access to your preferences and resume." />
//           </ListItem>
//         </List>

//         {error && (
//           <Alert severity="error" sx={{ borderRadius: 2 }}>
//             {error}
//           </Alert>
//         )}

//         <Button
//           variant="contained"
//           color="primary"
//           size="large"
//           startIcon={<GoogleIcon />}
//           onClick={handleLogin}
//           disabled={loading}
//           sx={{
//             borderRadius: 2,
//             textTransform: "none",
//             fontWeight: 600,
//             py: 1.2,
//             boxShadow: "0 8px 20px rgba(66, 133, 244, 0.25)",
//           }}
//         >
//           {loading ? "Signing you in..." : "Continue with Google"}
//         </Button>
//       </Stack>
//     </Box>
//   );
// }

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
          {/* Icon */}
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
              <AutoAwesomeIcon
                sx={{ fontSize: 40, color: "white" }}
              />
            </Box>
          </Box>

          {/* Title */}
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

          {/* Features List */}
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

          {/* Error Alert */}
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

          {/* Sign In Button */}
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