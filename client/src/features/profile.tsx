import React, { useState, useEffect } from "react";
import { User } from "../models/userModel";
import {
  getWithAuth,
  multipartGetWithAuth,
  multipartPostWithAuth,
  postWithAuth,
} from "../api/base";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stack,
  Fade,
  Chip,
} from "@mui/material";
import CenteredCircularProgress from "../components/centeredCircularProgress";
import ResumeUploadModal from "../components/resumeUploadModal";
import { SetAttentionItem } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function Profile({
  setAttentionItem,
  onLogout,
}: {
  setAttentionItem: SetAttentionItem;
  onLogout?: () => void | Promise<void>;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await getWithAuth("/profile");
        setUser(response.user);
        setFormData(response.user);
        setAttentionItem("profile", response?.user?.attention_needed);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (field: keyof User, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(user));
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const response = await postWithAuth("/profile", formData);
      if (response?.user) {
        setUser(response.user);
      }
      setAttentionItem("profile", response?.user?.attention_needed);
      setHasChanges(false);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData(user);
      setHasChanges(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await multipartPostWithAuth("/profile/resume", formData);
      if (response?.user) {
        setUser(response.user);
      }
      setAttentionItem("profile", response?.user?.attention_needed);
    } catch (err) {
      console.error("Error uploading resume:", err);
    } finally {
      setOpen(false);
    }
  };

  const handleResumeDownload = async () => {
    try {
      const response = await multipartGetWithAuth("/profile/resume");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("content-disposition");
      let filename = "resume";
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading resume:", err);
    }
  };

  if (loading) return <CenteredCircularProgress />;

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          height: "100%",
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3, width: "100%" }}
        >
          {/* Left section: Icon + text */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                background:
                  "linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(6, 182, 212, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.main",
              }}
            >
              <AccountCircleIcon sx={{ fontSize: 28 }} />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "text.primary",
              }}
            >
              Profile Information
            </Typography>
          </Stack>

          {/* Right section: Logout */}
          {onLogout && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={onLogout}
              sx={{
                ml: "auto",
                borderRadius: 2,
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
          )}
        </Stack>


        {/* Resume Section */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2.5,
            bgcolor: user?.resume
              ? "rgba(16, 185, 129, 0.05)"
              : "rgba(239, 68, 68, 0.05)",
            border: "1px solid",
            borderColor: user?.resume
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <DescriptionIcon
              color={user?.resume ? "success" : "error"}
              sx={{ fontSize: 28 }}
            />
            <Box sx={{ flex: 1 }}>
              {user?.resume ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  >
                    {user.resume.file_name}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleResumeDownload}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.75rem",
                      p: 0,
                      minWidth: 0,
                    }}
                  >
                    Download
                  </Button>
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "error.main" }}
                >
                  You must upload a resume
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => setOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {user?.resume ? "Replace" : "Upload"}
            </Button>
          </Stack>
        </Box>

        <ResumeUploadModal
          open={open}
          onClose={() => setOpen(false)}
          onUpload={handleUpload}
        />

        {/* Form Fields */}
        <Stack spacing={2.5}>
          <TextField
            label="Name"
            size="small"
            value={formData.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!formData.name}
            helperText={!formData.name ? "Name is required" : ""}
          />

          <TextField
            label="Email"
            size="small"
            value={formData.email || ""}
            disabled
            sx={{
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "rgba(0, 0, 0, 0.6)",
              },
            }}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="City"
              size="small"
              fullWidth
              value={formData.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              error={!formData.city}
              helperText={!formData.city ? "Required" : ""}
            />
            <TextField
              label="Country"
              size="small"
              fullWidth
              value={formData.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              error={!formData.country}
              helperText={!formData.country ? "Required" : ""}
            />
          </Stack>

          <TextField
            label="Postal Code (optional)"
            size="small"
            value={formData.postal_code || ""}
            onChange={(e) => handleChange("postal_code", e.target.value)}
          />

          <TextField
            label="Universal Personal Prompt (optional)"
            size="small"
            multiline
            minRows={3}
            value={formData.personal_prompt || ""}
            onChange={(e) => handleChange("personal_prompt", e.target.value)}
            placeholder="Add any personal details or preferences for your cover letters..."
          />
        </Stack>

        {/* Action Buttons */}
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            size="medium"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={!hasChanges || saving}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            size="medium"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || saving}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}