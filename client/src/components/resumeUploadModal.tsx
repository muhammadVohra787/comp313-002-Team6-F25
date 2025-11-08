import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Stack,
  Fade,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const ResumeUploadModal = ({ open, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      await onUpload(file);
      onClose();
    } catch (err) {
      console.error("Error uploading resume:", err);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleCancel = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: "1.125rem",
          fontWeight: 700,
          pb: 1,
        }}
      >
        Upload Resume
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "divider",
            borderRadius: 3,
            textAlign: "center",
            p: 4,
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            bgcolor: dragging
              ? "rgba(79, 70, 229, 0.05)"
              : file
                ? "rgba(16, 185, 129, 0.05)"
                : "rgba(248, 250, 252, 0.5)",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "rgba(79, 70, 229, 0.05)",
              transform: "scale(1.01)",
            },
          }}
          onClick={() =>
            document.getElementById("resume-upload-input")?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) {
              setFile(e.dataTransfer.files[0]);
            }
          }}
        >
          <input
            id="resume-upload-input"
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => e.target.files && setFile(e.target.files[0])}
          />

          <Stack alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: file ? "success.main" : "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              {file ? (
                <CheckCircleIcon sx={{ fontSize: 32, color: "white" }} />
              ) : (
                <CloudUploadIcon sx={{ fontSize: 32, color: "white" }} />
              )}
            </Box>

            {file ? (
              <Fade in>
                <Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.5 }}
                  >
                    <DescriptionIcon
                      color="success"
                      sx={{ fontSize: 20 }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {file.name}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Fade>
            ) : (
              <Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  Click or drag file to upload
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports PDF, DOC, DOCX
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {uploading && (
          <Fade in>
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                sx={{
                  borderRadius: 1,
                  height: 6,
                }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, textAlign: "center" }}
              >
                Uploading your resume...
              </Typography>
            </Box>
          </Fade>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={handleCancel}
          disabled={uploading}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
          }}
        >
          {uploading ? "Uploading..." : "Upload Resume"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResumeUploadModal;