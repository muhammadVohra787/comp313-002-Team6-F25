// client/src/features/historyPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { getWithAuth, multipartPostWithAuth } from "../api/base";
import { getAuthData } from "../api/auth";
import { getGoogleAccessToken } from "../utils/googleIdentity";
import { buildCoverLetterWordHtml } from "../utils/coverLetterExport";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

interface HistoryItem {
  id: string;
  userId: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  url?: string;
  source?: string;
  tone?: string;
  status?: "Applied" | "Not Applied";
  createdAt?: string;
}

interface LetterVersion {
  id: string;
  historyId: string;
  markdown: string;
  tone?: string;
  userPrompt?: string;
  version?: number;
  createdAt?: string;
}

const API_BASE =
  `${import.meta.env.VITE_API_URL}/api` || "http://localhost:5000";

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Versions modal state
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [versions, setVersions] = useState<LetterVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [savingVersionToDrive, setSavingVersionToDrive] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getWithAuth("/history");
        setHistory(res.history ?? []);
      } catch (err) {
        console.error("Failed to load history", err);
        setError("Failed to load job history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const handleExport = async () => {
    try {
      const auth = await getAuthData();
      if (!auth?.token) {
        setError("Please sign in again to export your history.");
        return;
      }

      const res = await fetch(`${API_BASE}/history/export`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "job-history.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export history", err);
      setError("Failed to export job history. Please try again.");
    }
  };

  const handleSaveSelectedVersionToDrive = async () => {
    if (
      !selectedHistoryItem ||
      versions.length === 0 ||
      selectedVersionIndex < 0 ||
      selectedVersionIndex >= versions.length
    ) {
      return;
    }

    try {
      setSavingVersionToDrive(true);
      setSaveMessage(null);

      const version = versions[selectedVersionIndex];

      // 1. Build Word-compatible HTML just like on the main page
      const html = buildCoverLetterWordHtml(
        version.markdown,
        selectedHistoryItem.jobTitle,
        selectedHistoryItem.companyName
      );

      const blob = new Blob([html], { type: "application/msword" });

      // 2. Build a nice filename
      const dateStr = new Date().toISOString().split("T")[0];
      const jobSafe =
        selectedHistoryItem.jobTitle?.replace(/[^\w\-]+/g, "_") || "job";
      const versionSuffix =
        typeof version.version === "number" ? `_v${version.version}` : "";
      const filename = `CoverLetter_${jobSafe}${versionSuffix}_${dateStr}.doc`;

      // 3. Get Google access token
      const googleToken = await getGoogleAccessToken(true);

      // 4. Build form data and upload via backend
      const formData = new FormData();
      formData.append("file", blob, filename);

      if (selectedHistoryItem.jobTitle) {
        formData.append("jobTitle", selectedHistoryItem.jobTitle);
      }
      if (selectedHistoryItem.companyName) {
        formData.append("companyName", selectedHistoryItem.companyName);
      }

      await multipartPostWithAuth("/drive/cover-letter", formData, {
        "X-Google-Token": googleToken,
      });

      setSaveMessage("Saved to Google Drive");
    } catch (err) {
      console.error("Failed to save version to Drive", err);
      setSaveMessage("Failed to save to Google Drive");
    } finally {
      setSavingVersionToDrive(false);
    }
  };

  const toggleStatus = async (item: HistoryItem) => {
    try {
      const auth = await getAuthData();
      if (!auth?.token) {
        setError("Please sign in again to update status.");
        return;
      }

      const newStatus =
        (item.status || "Not Applied") === "Applied"
          ? "Not Applied"
          : "Applied";

      setUpdatingStatusId(item.id);

      const res = await fetch(`${API_BASE}/history/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }

      setHistory((prev) =>
        prev.map((h) => (h.id === item.id ? { ...h, status: newStatus } : h))
      );
    } catch (err: any) {
      console.error("Failed to update status", err);
      setError(
        err?.message || "Failed to update job status. Please try again."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openVersions = async (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setVersionsOpen(true);
    setVersionsLoading(true);
    setVersionsError(null);
    setVersions([]);
    setCopyMessage(null);
    setSelectedVersionIndex(0);

    try {
      const res = await getWithAuth(`/history/${item.id}/letters`);
      setVersions(res.letters ?? []);
      setSelectedVersionIndex(0);
    } catch (err) {
      console.error("Failed to load letter versions", err);
      setVersionsError(
        "Failed to load letter versions. Try regenerating a cover letter."
      );
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleDelete = async (item: HistoryItem) => {
    const confirmed = window.confirm(
      "Remove this job from your history? This will also remove its saved cover letters."
    );
    if (!confirmed) return;

    try {
      const auth = await getAuthData();
      if (!auth?.token) {
        setError("Please sign in again to delete jobs.");
        return;
      }

      setDeletingId(item.id);

      const res = await fetch(`${API_BASE}/history/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete history item");
      }

      setHistory((prev) => prev.filter((h) => h.id !== item.id));
    } catch (err: any) {
      console.error("Failed to delete history item", err);
      setError(
        err?.message ||
          "Failed to delete this job from history. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const closeVersions = () => {
    setVersionsOpen(false);
    setSelectedHistoryItem(null);
    setVersions([]);
    setSelectedVersionIndex(0);
    setCopyMessage(null);
  };

  const handleCopyVersion = (markdown: string, versionLabel?: string) => {
    navigator.clipboard.writeText(markdown);
    setCopyMessage(
      versionLabel ? `Version ${versionLabel} copied to clipboard.` : "Copied!"
    );
    setTimeout(() => setCopyMessage(null), 2000);
  };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 1,
          p: 3,
        }}
      >
        <Alert severity="error">{error}</Alert>
        <Typography variant="body2" color="text.secondary">
          Try refreshing the page or generating a new cover letter.
        </Typography>
      </Box>
    );
  }

  if (!history.length) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No job history yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate a cover letter and your applications will appear here.
        </Typography>
      </Box>
    );
  }

  const selectedVersion =
    versions.length > 0 ? versions[selectedVersionIndex] : null;
  const selectedVersionLabel =
    selectedVersion?.version ??
    (selectedVersion ? selectedVersionIndex + 1 : 1);

  return (
    <>
      {/* Main history table */}
      <Box
        sx={{
          maxHeight: "calc(100vh - 220px)",
          display: "flex",
          flexDirection: "column",
          p: 2.5,
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Job Application History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review your generated cover letters, compare versions, and manage
              application status.
            </Typography>
          </Box>
          <Tooltip title="Export as CSV and open in Google Sheets">
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              startIcon={<DownloadIcon fontSize="small" />}
              sx={{ borderRadius: 3 }}
            >
              Export
            </Button>
          </Tooltip>
        </Stack>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            flex: 1,
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Versions</TableCell>
                <TableCell align="right">Link / Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => {
                const date = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "";
                const isApplied = (item.status || "Not Applied") === "Applied";
                const isUpdating = updatingStatusId === item.id;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{date}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.jobTitle || "Untitled"}
                      </Typography>
                      {item.location && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {item.location}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          isApplied
                            ? "Click to mark as Not Applied"
                            : "Click to mark as Applied"
                        }
                      >
                        <span>
                          <Chip
                            label={isApplied ? "Applied" : "Not Applied"}
                            size="small"
                            color={isApplied ? "success" : "default"}
                            onClick={() => toggleStatus(item)}
                            disabled={isUpdating}
                            sx={{
                              cursor: isUpdating ? "default" : "pointer",
                              opacity: isUpdating ? 0.6 : 1,
                              fontSize: "0.75rem",
                            }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View saved letter versions">
                        <span>
                          <Chip
                            icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                            label="View versions"
                            size="small"
                            variant="outlined"
                            onClick={() => openVersions(item)}
                            sx={{ fontSize: "0.75rem" }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                      >
                        {item.url && (
                          <Tooltip title="Open job posting">
                            <IconButton
                              size="small"
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete from history">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Versions modal */}
      <Dialog
        open={versionsOpen}
        onClose={closeVersions}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedHistoryItem ? (
            <>
              Cover Letter Versions –{" "}
              {selectedHistoryItem.jobTitle || "Unnamed job"}
              {selectedHistoryItem.companyName
                ? ` - job post @ ${selectedHistoryItem.companyName}`
                : ""}
            </>
          ) : (
            "Cover Letter Versions"
          )}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ maxHeight: "60vh", bgcolor: "background.default" }}
        >
          {versionsLoading && (
            <Box
              sx={{
                py: 4,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {!versionsLoading && versionsError && (
            <Alert severity="error">{versionsError}</Alert>
          )}

          {!versionsLoading && !versionsError && versions.length === 0 && (
            <Typography color="text.secondary">
              No versions saved yet. Generate or regenerate a cover letter for
              this job to create versions.
            </Typography>
          )}

          {!versionsLoading && !versionsError && versions.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Version selector */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Version</InputLabel>
                  <Select
                    label="Version"
                    value={selectedVersionIndex}
                    onChange={(e) =>
                      setSelectedVersionIndex(Number(e.target.value))
                    }
                  >
                    {versions.map((v, index) => {
                      const label = `v${v.version ?? index + 1}`;
                      return (
                        <MenuItem key={v.id} value={index}>
                          {label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {selectedVersion && (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ ml: { xs: 0, sm: "auto" } }}
                  >
                    {selectedVersion.tone && (
                      <Chip
                        label={selectedVersion.tone}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: "0.75rem" }}
                      />
                    )}
                    {selectedVersion.createdAt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {new Date(selectedVersion.createdAt).toLocaleString()}
                      </Typography>
                    )}
                    <Tooltip title="Copy this version to clipboard">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyVersion(
                            selectedVersion.markdown,
                            `v${selectedVersionLabel}`
                          )
                        }
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>

              <Divider />

              {selectedVersion && (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {selectedVersion.userPrompt && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <InfoOutlinedIcon fontSize="small" />
                        Instructions used for this version:
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic" }}
                      >
                        {selectedVersion.userPrompt}
                      </Typography>
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  )}

                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 320,
                      overflowY: "auto",
                      p: 2,
                      borderRadius: 2,
                      fontSize: "0.9rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedVersion.markdown}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        {/* <DialogActions sx={{ justifyContent: "space-between" }}>
          {copyMessage && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CheckCircleIcon
                fontSize="small"
                sx={{ color: "success.main" }}
              />
              <Typography variant="caption" color="success.main">
                {copyMessage}
              </Typography>
            </Stack>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={closeVersions}>Close</Button>
        </DialogActions> */}
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Stack direction="column" spacing={0.5}>
            {copyMessage && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckCircleIcon
                  fontSize="small"
                  sx={{ color: "success.main" }}
                />
                <Typography variant="caption" color="success.main">
                  {copyMessage}
                </Typography>
              </Stack>
            )}

            {saveMessage && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CloudUploadIcon
                  fontSize="small"
                  sx={{
                    color: saveMessage.startsWith("Failed")
                      ? "error.main"
                      : "success.main",
                  }}
                />
                <Typography
                  variant="caption"
                  color={
                    saveMessage.startsWith("Failed")
                      ? "error.main"
                      : "success.main"
                  }
                >
                  {saveMessage}
                </Typography>
              </Stack>
            )}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloudUploadIcon />}
              onClick={handleSaveSelectedVersionToDrive}
              disabled={savingVersionToDrive || versions.length === 0}
            >
              {savingVersionToDrive ? "Saving..." : "Save to Drive"}
            </Button>
            <Button onClick={closeVersions}>Close</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HistoryPage;
