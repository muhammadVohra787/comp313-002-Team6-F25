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
  CircularProgress,
  Typography,
  Paper,
  Divider,
} from "@mui/material";
import CenteredCircularProgress from "../components/centeredCircularProgress";
import ResumeUploadModal from "../components/resumeUploadModal";
import { SetAttentionItem } from "../types";
import DownloadIcon from "@mui/icons-material/Download";

export default function Profile({
  setAttentionItem,
}: {
  setAttentionItem: SetAttentionItem;
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
        // TODO: get and show the resume on file.
        // setResumeFile(response?.user?.resume || null);
        // setResumeText(response?.user?.resume || "Resume is required");
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
      // Convert to blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link to trigger download
      const a = document.createElement("a");
      a.href = url;
      // Use the filename from headers if available, fallback to generic
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
    <Paper
      elevation={3}
      sx={{
        p: 1,
        borderRadius: 3,
        width: "100%",
        maxWidth: 450,
        m: 1,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Profile Information
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        {user?.resume ? (
          <a
            href="#"
            onClick={handleResumeDownload}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 16,
              fontWeight: 500,
              color: "#1976d2",
              textDecoration: "underline",
            }}
          >
            {user.resume.file_name}
          </a>
        ) : (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 500, color: "error.main", fontSize: 16 }}
          >
            You must upload a resume
          </Typography>
        )}

        {/* Manage link styled same way */}
        <a
          href="#"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 16,
            fontWeight: 500,
            color: "#1976d2",
            textDecoration: "underline",
          }}
          onClick={() => setOpen(true)}
        >
          Manage
        </a>
      </Box>

      <ResumeUploadModal
        open={open}
        onClose={() => setOpen(false)}
        onUpload={handleUpload}
      />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Name"
          size="small"
          value={formData.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          error={!formData.name}
        />

        <TextField
          label="Email"
          size="small"
          value={formData.email || ""}
          disabled
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="City"
            size="small"
            fullWidth
            value={formData.city || ""}
            onChange={(e) => handleChange("city", e.target.value)}
            error={!formData.city}
          />
          <TextField
            label="Country"
            size="small"
            fullWidth
            value={formData.country || ""}
            onChange={(e) => handleChange("country", e.target.value)}
            error={!formData.country}
          />
        </Box>

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
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={handleReset}
          disabled={!hasChanges || saving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          color="success"
          size="small"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Paper>
  );
}
