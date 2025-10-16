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
} from "@mui/material";

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
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: "1rem", fontWeight: 500 }}>
        Upload Resume
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            border: "2px dashed #ccc",
            borderRadius: 2,
            textAlign: "center",
            p: 3,
            cursor: "pointer",
            transition: "0.2s",
            "&:hover": { borderColor: "primary.main" },
            backgroundColor: dragging ? "action.hover" : "transparent",
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

          <Typography variant="body1">
            {file ? file.name : "Click or drag file to upload"}
          </Typography>

          {file && (
            <Typography variant="caption" color="text.secondary">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          )}
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Uploading...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={uploading} size="small">
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          size="small"
        >
          {uploading ? "Uploading..." : "Upload Resume"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResumeUploadModal;
