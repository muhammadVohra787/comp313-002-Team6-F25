import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Fade,
  CircularProgress,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { postWithAuth } from "../api/base";
import { JobDescription } from "../models/coverLetter";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { getAuthData } from "../api/auth";

interface MainPageProps {
  isAuthenticated: boolean;
}

export default function MainPage({ isAuthenticated }: MainPageProps) {
  // scrapedData holds job info scraped from the current tab
  const [scrapedData, setScrapedData] = useState<JobDescription | null>(null);
  // generated cover letter text
  const [coverLetterMarkdown, setCoverLetterMarkdown] = useState<string>("");
  // loading for scraping
  const [loading, setLoading] = useState<boolean>(false);
  // loading for cover letter generation
  const [generatingCoverLetter, setGeneratingCoverLetter] =
    useState<boolean>(false);
  // error messages to show in alert
  const [error, setError] = useState<string>("");
  // version increases every time we regenerate
  const [version, setVersion] = useState<number>(0);
  // tone for the LLM prompt
  const [tone, setTone] = useState<string>("professional");
  // extra user prompt to send to backend for more context
  const [userPrompt, setUserPrompt] = useState<string>("");
  // show small "copied" feedback
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Scrape active tab for job details using content script
  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setCoverLetterMarkdown("");
    setVersion(0);
    setUserPrompt("");

    try {
      // get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found");

      // send message to content script to scrape
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tab.id!,
          { type: "SCRAPE_PAGE" },
          async (response) => {
            if (chrome.runtime.lastError)
              return reject(new Error(chrome.runtime.lastError.message));

            if (response?.success) {
              const payload: JobDescription = response.payload;
              setScrapedData(payload);

              // auto-generate cover letter if user is logged in
              if (isAuthenticated) {
                await generateCoverLetter(payload, tone, "");
              }
              resolve();
            } else {
              reject(new Error(response?.error || "Scraping failed"));
            }
          }
        );
      });
    } catch (err: any) {
      setError(err?.message || "Unknown error while scraping");
    } finally {
      setLoading(false);
    }
  };

  // Call backend to generate a cover letter based on scraped job + user prompt + tone
  const generateCoverLetter = async (
    jobData: JobDescription,
    selectedTone: string,
    customPrompt: string
  ) => {
    setGeneratingCoverLetter(true);
    setError("");

    try {
      const payload = {
        ...jobData,
        tone: selectedTone,
        userPrompt: customPrompt,
      };
      // need token for protected endpoint
      const authData = await getAuthData();
      if (!authData?.token)
        throw new Error("Missing auth token — please log in again.");
      const result = await postWithAuth(
        "/cover-letter",
        payload,
        authData.token
      );
      setCoverLetterMarkdown(result?.markdown || "");
      setVersion((v) => v + 1);
    } catch (err: any) {
      console.error("Error during cover letter generation:", err);
      setError(
        err?.message || "Failed to generate cover letter. Please try again."
      );
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  // Regenerate with current tone + current prompt
  const handleRegenerate = () => {
    if (scrapedData) generateCoverLetter(scrapedData, tone, userPrompt);
  };

  // Copy current cover letter to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(coverLetterMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download as basic Word (HTML) document
  const handleDownloadWord = async () => {
    if (!scrapedData || !coverLetterMarkdown) {
      alert("No cover letter available to download.");
      return;
    }

    // convert markdown-ish text to simple HTML paragraphs
    const wordHtml = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt; 
          }
          p { 
            line-height: 1.5; 
            margin-bottom: 10pt; 
          }
        </style>
      </head>
      <body>
        ${coverLetterMarkdown
          .split("\n\n")
          .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
          .join("")}
      </body>
    </html>
  `;

    const blob = new Blob([wordHtml], { type: "application/msword" });
    const dateStr = new Date().toISOString().split("T")[0];
    saveAs(blob, `CoverLetter_${dateStr}.doc`);
  };

  // Download as PDF using jsPDF
  const handleDownloadPDF = async () => {
    if (!coverLetterMarkdown) {
      alert("No cover letter available to download.");
      return;
    }

    const paragraphs = coverLetterMarkdown.split("\n\n");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "letter" });
    const marginTop = 72;
    const marginSides = 60;
    const lineHeight = 14;
    const paragraphSpacing = 12;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - marginSides * 2;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFont("times", "normal");
    pdf.setFontSize(12);

    let y = marginTop;

    // write each paragraph to pdf, add new page if needed
    paragraphs.forEach((para) => {
      const lines = pdf.splitTextToSize(para, usableWidth);
      lines.forEach((line) => {
        if (y + lineHeight > pageHeight - marginTop) {
          pdf.addPage();
          y = marginTop;
        }
        pdf.text(line, marginSides, y);
        y += lineHeight;
      });
      y += paragraphSpacing;
    });

    const dateStr = new Date().toISOString().split("T")[0];
    pdf.save(`CoverLetter_${dateStr}.pdf`);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        height: "100%",
        minHeight: 0,
        p: 3,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* Header Section: title + scrape button */}
      <Fade in timeout={400}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
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
              <WorkOutlineIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Job Snapshot
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pull job details from the active tab
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            size="medium"
            onClick={handleScrape}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <WorkOutlineIcon />
              )
            }
            sx={{
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            }}
          >
            {loading ? "Scraping..." : "Scrape Job"}
          </Button>
        </Stack>
      </Fade>
      {/* Info alert shown when user is not logged in */}
      {!isAuthenticated && (
        <Fade in>
          <Alert
            severity="info"
            sx={{
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "info.light",
            }}
          >
            Log in with Google to generate personalized cover letters
          </Alert>
        </Fade>
      )}

      {/* Error alert block */}
      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "error.light",
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Cover Letter section - only show if logged in and we have a job */}
      {isAuthenticated && scrapedData && (
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",

              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Header: title, version, actions */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 20, color: "white" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Cover Letter
                      {version > 0 && (
                        <Chip
                          label={`v${version}`}
                          size="small"
                          sx={{
                            ml: 1,
                            height: 20,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Typography>
                  </Box>
                </Stack>

                {/* Action buttons: copy, download word, download pdf */}
                {coverLetterMarkdown && (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title={copySuccess ? "Copied!" : "Copy"} arrow>
                      <IconButton
                        size="small"
                        onClick={handleCopyToClipboard}
                        sx={{
                          bgcolor: copySuccess
                            ? "success.main"
                            : "background.paper",
                          color: copySuccess ? "white" : "text.secondary",
                          border: "1px solid",
                          borderColor: copySuccess ? "success.main" : "divider",
                          "&:hover": {
                            bgcolor: copySuccess
                              ? "success.dark"
                              : "action.hover",
                          },
                        }}
                      >
                        {copySuccess ? (
                          <CheckCircleIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <ContentCopyIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Download Word" arrow>
                      <IconButton
                        size="small"
                        onClick={handleDownloadWord}
                        sx={{
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          color: "primary.main",
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Download PDF" arrow>
                      <IconButton
                        size="small"
                        onClick={handleDownloadPDF}
                        sx={{
                          bgcolor: "background.paper",
                          border: "1px solid",
                          borderColor: "divider",
                          color: "secondary.main",
                        }}
                      >
                        <DownloadIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>

              {/* Cover letter text area / empty state */}
              {coverLetterMarkdown ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    maxHeight: 360,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "rgba(0,0,0,0.2)",
                      borderRadius: 3,
                    },
                  }}
                >
                  <TextField
                    multiline
                    fullWidth
                    minRows={8}
                    maxRows={20}
                    value={coverLetterMarkdown}
                    onChange={(e) => setCoverLetterMarkdown(e.target.value)}
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        fontFamily: "inherit",
                        fontSize: "0.875rem",
                        lineHeight: 1.7,
                      },
                    }}
                  />
                </Paper>
              ) : (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 3,
                    px: 2,
                    borderRadius: 2.5,
                    bgcolor: "rgba(248, 250, 252, 0.6)",
                    border: "1px dashed",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {generatingCoverLetter || loading
                      ? "Generating your tailored cover letter..."
                      : "Scrape a job to generate a cover letter"}
                  </Typography>
                </Box>
              )}

              {/* Controls for extra instructions + tone + regenerate */}
              <Stack spacing={2} sx={{ mt: 3, mb: 2 }}>
                <TextField
                  label="Additional instructions (optional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Add any context to tailor the cover letter..."
                  variant="outlined"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />

                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="center"
                >
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Tone</InputLabel>
                    <Select
                      value={tone}
                      label="Tone"
                      onChange={(e) => setTone(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="professional">Professional</MenuItem>
                      <MenuItem value="enthusiastic">Enthusiastic</MenuItem>
                      <MenuItem value="casual">Casual</MenuItem>
                      <MenuItem value="formal">Formal</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      generatingCoverLetter ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <RefreshIcon />
                      )
                    }
                    onClick={handleRegenerate}
                    disabled={generatingCoverLetter}
                    sx={{
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                      px: 2.5,
                      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                    }}
                  >
                    {generatingCoverLetter ? "Generating..." : "Regenerate"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
}
