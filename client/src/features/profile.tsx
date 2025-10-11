import React, { useState, useEffect } from "react";
import { User } from "../models/userModel";
import { getWithAuth, multipartPostWithAuth, postWithAuth } from "../api/base";
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

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const allowedExtensions = ["pdf", "doc", "docx", "txt"];
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await getWithAuth("/profile");

        setUser(response.user);
        setFormData(response.user);

        // TODO: get and show the resume on file.
        // setResumeFile(response?.user?.resume || null);
        // setResumeText(response?.user?.resume || "Resume is required");
      } catch (error) {
        console.error("Error fetching user:", error);
        return <p>Something went wrong, {error}</p>;
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

      // Use FormData for mixed text + file
      const data = new FormData();

      // Append all text fields (like name, email, city, etc.)
      for (const key in formData) {
        const value = formData[key];
        if (value !== undefined && value !== null) {
          data.append(key, value);
        }
      }

      // Append the resume file (if any)
      if (resumeFile) {
        data.append("file", resumeFile); // ✅ backend expects "file"
      }

      // Send request (DO NOT manually set Content-Type)
      const response = await multipartPostWithAuth("/profile", data);

      // If backend returns updated user
      if (response?.user) {
        setUser(response.user);
      }

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
      setResumeFile(null);
      setResumeText(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setHasChanges(true);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        setError("Only PDF, Word, or TXT files are allowed.");
        return;
      }

      setResumeFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setResumeText(text);
      };
      reader.readAsText(file);
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

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
        Resume Upload
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          fullWidth
          size="small"
          color="primary"
        >
          {resumeFile ? "Replace Resume" : "Upload Resume"}
          <input type="file" hidden onChange={handleFileChange} />
        </Button>

        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1 }}
          color={error ? "error" : "text.secondary"}
        >
          {error
            ? error
            : resumeFile
            ? `Selected: ${resumeFile.name}`
            : "Upload a PDF, Word, or TXT file"}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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
