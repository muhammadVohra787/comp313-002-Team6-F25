import React, { useState, useEffect } from "react";
import { User } from "../models/userModel";
import {
  getWithAuth,
  multipartGetWithAuth,
  multipartPostWithAuth,
  postWithAuth,
  deleteWithAuth,
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
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { getGoogleAccessToken } from "../utils/googleIdentity";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export default function Profile({
  setAttentionItem,
  onLogout,
}: {
  setAttentionItem: SetAttentionItem;
  onLogout?: () => void | Promise<void>;
}) {
  // user = server copy (current saved profile)
  const [user, setUser] = useState<User | null>(null);
  // page-level loading
  const [loading, setLoading] = useState(true);
  // formData = local editable copy of user
  const [formData, setFormData] = useState<Partial<User>>({});
  // whether form has unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  // saving state for the save button
  const [saving, setSaving] = useState(false);
  // show/hide resume upload modal
  const [open, setOpen] = useState(false);
  // saving resume to Drive
  const [savingResumeToDrive, setSavingResumeToDrive] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await getWithAuth("/profile");
        // set user and prefill form
        setUser(response.user);
        setFormData(response.user);
        // update attention indicator in parent
        setAttentionItem("profile", response?.user?.attention_needed);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Handle input changes and detect if it deviates from original user
  const handleChange = (field: keyof User, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // compare to original user to know if we should enable Save
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(user));
      return updated;
    });
  };

  // Save profile to backend
  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const response = await postWithAuth("/profile", formData);
      if (response?.user) {
        // update both sources of truth
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

  // Reset form to last saved user
  const handleReset = () => {
    if (user) {
      setFormData(user);
      setHasChanges(false);
    }
  };

  // Handle resume upload from modal
  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await multipartPostWithAuth("/profile/resume", formData);
      if (response?.user) {
        setUser(response.user);
        setFormData(response.user);
      }
      setAttentionItem("profile", response?.user?.attention_needed);
    } catch (err) {
      console.error("Error uploading resume:", err);
    } finally {
      setOpen(false);
    }
  };

  // Download latest resume from backend
  const handleResumeDownload = async () => {
    try {
      const response = await multipartGetWithAuth("/profile/resume");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // try to read filename from header
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

  // Save latest resume from backend to Google Drive
  const handleSaveResumeToDrive = async () => {
    if (!user?.resume) return;

    try {
      setSavingResumeToDrive(true);

      // 1. Get the resume file from backend (same endpoint as Download)
      const response = await multipartGetWithAuth("/profile/resume");
      const blob = await response.blob();

      // Try to read filename from header, fallback to "resume"
      let filename = "resume";
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }

      // 2. Get a Google access token for Drive
      const googleToken = await getGoogleAccessToken(true);

      // 3. Build form-data and call the Drive upload endpoint
      const formData = new FormData();
      formData.append("file", blob, filename);

      await multipartPostWithAuth("/drive/cover-letter", formData, {
        "X-Google-Token": googleToken,
      });

      alert("Resume saved to Google Drive!");
    } catch (err) {
      console.error("Error saving resume to Google Drive:", err);
      alert("Could not save resume to Google Drive. Please try again.");
    } finally {
      setSavingResumeToDrive(false);
    }
  };
    
  const handleResumeDelete = async () => {
    if (!user?.resume) return;
    const confirmed = window.confirm(
      "Delete your uploaded resume? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      const response = await deleteWithAuth("/profile/resume");
      if (response?.user) {
        setUser(response.user);
        setFormData(response.user);
      }
      setAttentionItem("profile", response?.user?.attention_needed);
    } catch (err) {
      console.error("Error deleting resume:", err);
    }
  };

  // initial loading state
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
        {/* Header: title + logout */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3, width: "100%" }}
        >
          {/* Left section: Icon + label */}
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

          {/* Logout button (only if parent passed the handler) */}
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

        {/* Resume status section */}
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            px: 3,
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
          {user?.resume ? (
            <>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <DescriptionIcon
                  color="success"
                  sx={{ fontSize: 28 }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  {user.resume.file_name}
                </Typography>
              </Stack>

              <Stack
                direction="row"
                spacing={1.4}
                sx={{
                  "& .MuiButton-root": {
                    minWidth: "auto",
                    px: 1.4,
                    py: 0.4,
                    height: 34,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <Button
                  variant="text"
                  startIcon={<DownloadIcon />}
                  onClick={handleResumeDownload}
                  sx={{ color: "primary.main" }}
                >
                  Download
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={() => setOpen(true)}
                >
                  Replace
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleSaveResumeToDrive}
                  disabled={savingResumeToDrive}
                >
                  {savingResumeToDrive ? "Saving..." : "Save to Drive"}
                </Button>

                <Button
                  variant="text"
                  onClick={handleResumeDelete}
                  sx={{ color: "error.main" }}
                >
                  Delete
                </Button>
              </Stack>
            </>
          ) : (
            <Stack direction="row" alignItems="center" spacing={2}>
              <DescriptionIcon
                color="error"
                sx={{ fontSize: 28 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "error.main" }}
                >
                  You must upload a resume
                </Typography>
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
                Upload
              </Button>
            </Stack>
          )}
        </Box>


        {/* Resume upload modal (file picker) */}
        <ResumeUploadModal
          open={open}
          onClose={() => setOpen(false)}
          onUpload={handleUpload}
        />

        {/* Profile form fields */}
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

          {/* City and Country side by side */}
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

        {/* Actions: reset and save */}
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
