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
        gap: 1,
        height: "100%",
        minHeight: 0,
        p: { xs: 2, sm: 3 },
        boxSizing: "border-box",
        overflowY: "auto",
        bgcolor: 'background.default',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
        },
      }}
    >
      {/* Header Section - Quick Action */}
      <Fade in timeout={400}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.3s ease',
              }}
            >
              <WorkOutlineIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 0.5,
                  fontSize: '0.95rem'
                }}
              >
                Extract Job Details
              </Typography>
              {scrapedData ? (
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      lineHeight: 1.4
                    }}
                  >
                    {scrapedData.jobTitle || 'Job title unavailable'}
                  </Typography>
                  {scrapedData.companyName && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                        display: 'block',
                        mt: 0.25
                      }}
                    >
                      {scrapedData.companyName}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}
                >
                  Analyze the current job posting
                </Typography>
              )}
            </Box>
          </Box>

          <Button
            variant="contained"
            size="large"
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
              borderRadius: '10px',
              px: 3,
              py: 1.25,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              minWidth: '140px',
              background: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 100%)',
              '&:hover:not(:disabled)': {
                background: 'linear-gradient(135deg, #4F46E5 0%, #0284C7 100%)',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
                transform: 'translateY(-2px)',
              },
              '&:active:not(:disabled)': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                opacity: 0.7,
              },
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
            }}
          >
            {loading ? "Analyzing..." : "Extract Job"}
          </Button>
        </Box>
      </Fade>
      {/* Alerts Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Info alert shown when user is not logged in */}
        {!isAuthenticated && (
          <Fade in>
            <Alert
              severity="info"
              variant="outlined"
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'info.light',
                bgcolor: 'rgba(14, 165, 233, 0.05)',
                '& .MuiAlert-icon': {
                  color: 'info.main',
                },
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Sign in required
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Log in with Google to generate personalized cover letters
                </Typography>
              </Box>
            </Alert>
          </Fade>
        )}

        {/* Error alert block */}
        {error && (
          <Fade in>
            <Alert
              severity="error"
              variant="outlined"
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'error.light',
                bgcolor: 'rgba(239, 68, 68, 0.05)',
                '& .MuiAlert-icon': {
                  color: 'error.main',
                },
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              <Typography variant="body2">
                {error}
              </Typography>
            </Alert>
          </Fade>
        )}
      </Box>

      {/* Cover Letter section - only show if logged in and we have a job */}
      {isAuthenticated && scrapedData && (
        <Fade in timeout={800}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)',
                borderColor: 'rgba(99, 102, 241, 0.2)'
              },
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Header: title, version, actions */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 3,
                  pb: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: 'text.primary',
                          lineHeight: 1.3
                        }}
                      >
                        Cover Letter
                      </Typography>
                      {version > 0 && (
                        <Chip
                          label={`v${version}`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(139, 92, 246, 0.1)',
                            color: 'primary.main',
                            '& .MuiChip-label': {
                              px: 1
                            }
                          }}
                        />
                      )}
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.8125rem',
                        mt: 0.5
                      }}
                    >
                      {generatingCoverLetter 
                        ? 'Generating your cover letter...' 
                        : 'Review and edit your generated cover letter'}
                    </Typography>
                  </Box>
                </Box>

                {/* Action buttons: copy, download word, download pdf */}
                {coverLetterMarkdown && (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      gap: 1,
                      ml: 'auto',
                      flexWrap: 'wrap',
                      '& .MuiButton-root': {
                        minWidth: 'auto',
                        px: 1.5,
                        height: 36,
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }
                    }}
                  >
                    <Tooltip 
                      title={copySuccess ? "Copied to clipboard!" : "Copy to clipboard"} 
                      arrow
                      placement="top"
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleCopyToClipboard}
                        startIcon={
                          copySuccess ? (
                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          )
                        }
                        sx={{
                          borderColor: copySuccess ? 'success.main' : 'divider',
                          color: copySuccess ? 'success.main' : 'text.secondary',
                          '&:hover': {
                            borderColor: copySuccess ? 'success.main' : 'text.secondary',
                            bgcolor: copySuccess ? 'rgba(16, 185, 129, 0.05)' : 'action.hover',
                          },
                        }}
                      >
                        {copySuccess ? 'Copied!' : 'Copy'}
                      </Button>
                    </Tooltip>

                    <Tooltip title="Download as Word" arrow placement="top">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleDownloadWord}
                        startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          borderColor: 'divider',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                          },
                        }}
                      >
                        Word
                      </Button>
                    </Tooltip>

                    <Tooltip title="Download as PDF" arrow placement="top">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleDownloadPDF}
                        startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                          },
                        }}
                      >
                        PDF
                      </Button>
                    </Tooltip>
                  </Box>
                )}
              </Box>

              {/* Cover letter text area */}
              {coverLetterMarkdown ? (
                <Box
                  sx={{
                    mb: 3,
                    '&:hover .cover-letter-actions': {
                      opacity: 1,
                      visibility: 'visible',
                    },
                    overflowY: 'hidden',
                  }}
                >
                  <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 400,
                    overflowY: 'auto',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.light',
                      boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.5)',
                    }
                  }}
                >
                  <TextField
                    multiline
                    fullWidth
                    minRows={10}
                    value={coverLetterMarkdown}
                    onChange={(e) => setCoverLetterMarkdown(e.target.value)}
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSize: '0.9375rem',
                        lineHeight: 1.7,
                        color: 'text.primary',
                        '&:focus': {
                          outline: 'none',
                        },
                      },
                    }}
                    placeholder="Your generated cover letter will appear here..."
                  />
                </Paper>
                
                {/* Floating action buttons */}
                {coverLetterMarkdown && (
                  <Box
                    className="cover-letter-actions"
                    sx={{
                      position: 'absolute',
                      right: 24,
                      top: -16,
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'background.paper',
                      p: 0.5,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      opacity: 0,
                      visibility: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        opacity: 1,
                        visibility: 'visible',
                      },
                    }}
                  >
                    <Tooltip title="Copy to clipboard" arrow>
                      <IconButton
                        size="small"
                        onClick={handleCopyToClipboard}
                        sx={{
                          width: 32,
                          height: 32,
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'rgba(99, 102, 241, 0.1)',
                          },
                        }}
                      >
                        {copySuccess ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : (
                          <ContentCopyIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 5,
                    px: 3,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(248, 250, 252, 0.6)',
                    border: '1px dashed',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.light',
                      bgcolor: 'rgba(99, 102, 241, 0.02)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: 'rgba(99, 102, 241, 0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      color: 'primary.main',
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600, 
                      color: 'text.primary',
                      mb: 0.75 
                    }}
                  >
                    {generatingCoverLetter || loading
                      ? 'Generating your cover letter...'
                      : 'Ready to create your cover letter'}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      maxWidth: '380px',
                      mx: 'auto',
                      lineHeight: 1.5,
                      mb: 2
                    }}
                  >
                    {generatingCoverLetter || loading
                      ? 'AI is analyzing the job description and crafting a personalized cover letter tailored to your profile.'
                      : 'Click "Scrape" above to extract job details from the current page, then we\'ll generate a customized cover letter in seconds.'}
                  </Typography>
                  {!generatingCoverLetter && !loading && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.75rem', color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>✓ AI-powered</Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>✓ Personalized</Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>✓ Instant</Box>
                    </Box>
                  )}
                  {(generatingCoverLetter || loading) && (
                    <CircularProgress 
                      size={24} 
                      thickness={4}
                      sx={{ 
                        color: 'primary.main',
                        mt: 1 
                      }} 
                    />
                  )}
                </Box>
              )}

              {/* Controls for extra instructions + tone + regenerate */}
              <Box
                sx={{
                  mt: 3,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2.5,
                  bgcolor: 'rgba(248, 250, 252, 0.6)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 1.5,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.9rem'
                  }}
                >
                  <AutoAwesomeIcon color="primary" fontSize="small" />
                  Customize
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      mb: 1,
                      fontSize: '0.8125rem'
                    }}
                  >
                    Add instructions or adjust tone:
                  </Typography>
                  
                  <TextField
                    label="Additional instructions (optional)"
                    size="small"
                    fullWidth
                    multiline
                    minRows={3}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="E.g., 'Emphasize my 5 years of experience in React and Node.js', 'Mention my certification in Project Management', etc."
                    variant="outlined"
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.light',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'text.secondary',
                      },
                      '& .MuiOutlinedInput-input': {
                        fontSize: '0.9375rem',
                      },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 200,
                      '& .MuiInputBase-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <InputLabel>Tone</InputLabel>
                    <Select
                      value={tone}
                      label="Tone"
                      onChange={(e) => setTone(e.target.value)}
                      sx={{
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          py: 1,
                        },
                      }}
                    >
                      <MenuItem value="professional">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            opacity: tone === 'professional' ? 1 : 0.5
                          }} />
                          <Box>
                            <Box sx={{ fontWeight: 500, lineHeight: 1.2 }}>Professional</Box>
                            <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>Formal and business-appropriate</Box>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="enthusiastic">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            opacity: tone === 'enthusiastic' ? 1 : 0.5
                          }} />
                          <Box>
                            <Box sx={{ fontWeight: 500, lineHeight: 1.2 }}>Enthusiastic</Box>
                            <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>Energetic and passionate</Box>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="casual">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                            opacity: tone === 'casual' ? 1 : 0.5
                          }} />
                          <Box>
                            <Box sx={{ fontWeight: 500, lineHeight: 1.2 }}>Casual</Box>
                            <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>Friendly and approachable</Box>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="formal">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%',
                            bgcolor: 'secondary.main',
                            opacity: tone === 'formal' ? 1 : 0.5
                          }} />
                          <Box>
                            <Box sx={{ fontWeight: 500, lineHeight: 1.2 }}>Formal</Box>
                            <Box sx={{ fontSize: '0.7rem', opacity: 0.7 }}>Very formal and traditional</Box>
                          </Box>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={
                      generatingCoverLetter ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <RefreshIcon />
                      )
                    }
                    onClick={handleRegenerate}
                    disabled={generatingCoverLetter}
                    sx={{
                      borderRadius: '12px',
                      px: 3,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.9375rem',
                      whiteSpace: 'nowrap',
                      minWidth: '160px',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
                        background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    {generatingCoverLetter ? 'Generating...' : 'Regenerate Cover Letter'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      )}
    </Box>
  );
}
