import React, { useState } from "react";
import { Alert, Box, Button, Divider, Paper, Typography, Chip, Grid, Card, CardContent } from "@mui/material";
import DOMPurify from "dompurify";
import { postWithAuth } from "../api/base";
import { JobDescription } from "../models/coverLetter";
import WorkIcon from "@mui/icons-material/Work";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkIcon from "@mui/icons-material/Link";
import SourceIcon from "@mui/icons-material/Public";

// Helper function to clean and format job description
const cleanHtml = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: []
  });
  
  // Replace multiple newlines and spaces with single space
  return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
};

// Function to format the job description with proper spacing
const formatJobDescription = (html: string): string => {
  if (!html) return '';
  
  // Clean the HTML first
  const clean = cleanHtml(html);
  
  // Split into sentences and format
  return clean
    .replace(/([.!?])\s*(?=[A-Z])/g, '$1|') // Split at sentence endings
    .split('|')
    .filter(s => s.trim().length > 0)
    .map(s => `• ${s.trim()}`)
    .join('\n\n');
};

interface MainPageProps {
  isAuthenticated: boolean;
}

export default function MainPage({ isAuthenticated }: MainPageProps) {
  const [scrapedData, setScrapedData] = useState<JobDescription | null>(null);
  const [coverLetterHtml, setCoverLetterHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setCoverLetterHtml("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("No active tab found");

      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tab.id!,
          { type: "SCRAPE_PAGE" },
          async (response) => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response?.success) {
              const payload: JobDescription = response.payload;
              setScrapedData(payload);

              if (isAuthenticated) {
                try {
                  const result = await postWithAuth(
                    "/cover-letter",
                    payload
                  );
                  setCoverLetterHtml(result?.html || "");
                } catch (err: any) {
                  setError(
                    err?.message ||
                      "Failed to generate cover letter. Please try again."
                  );
                }
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <WorkIcon color="primary" />
          Job Scraper
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleScrape}
          disabled={loading}
          startIcon={loading ? null : <WorkIcon />}
        >
          {loading ? "Scraping..." : "Scrape Job Details"}
        </Button>
      </Box>

      {!isAuthenticated && (
        <Alert severity="info">
          Log in with Google to generate a cover letter. You can still view the
          scraped job details without logging in.
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: "primary.main" }}>
            Scraped Job Information
          </Typography>

          {scrapedData ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* Job Title */}
              {scrapedData.jobTitle && (
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                    Job Title:
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 500 }}>
                    {scrapedData.jobTitle}
                  </Typography>
                </Box>
              )}

              {/* Company Name */}
              {scrapedData.companyName && (
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                    Company Name:
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    {scrapedData.companyName}
                  </Typography>
                </Box>
              )}

              {/* Location */}
              {scrapedData.location && (
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                    Location:
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon fontSize="small" color="action" />
                    {scrapedData.location}
                  </Typography>
                </Box>
              )}

              {/* Source & URL */}
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                  Source:
                </Typography>
                <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {scrapedData.source && (
                    <Chip
                      label={scrapedData.source}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", wordBreak: "break-all", fontSize: "0.85rem" }}
                  >
                    {scrapedData.url}
                  </Typography>
                </Box>
              </Box>

              {/* Job Description */}
              {scrapedData.jobDescription && (
                <Box>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                    Job Description:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 0.5,
                      p: 2,
                      backgroundColor: "#f9f9f9",
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                      maxHeight: 300,
                      overflow: 'auto',
                      whiteSpace: 'pre-line',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: 'transparent',
                      },
                      '& a': {
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      },
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: scrapedData.jobDescription 
                        .replace(/<\/h[1-6]>/g, '</h4>')  // Normalize all headings
                        .replace(/<h[1-6]/g, '<h4')         // to h4 for consistency
                    }}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <WorkIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Click &ldquo;Scrape Job Details&rdquo; to extract information from the active tab.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {isAuthenticated && scrapedData && (
        <Card elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Generated Cover Letter
            </Typography>
            {coverLetterHtml ? (
              <Paper
                elevation={0}
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(coverLetterHtml),
                  }}
                />
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {loading
                  ? "Generating cover letter..."
                  : "No cover letter generated yet."}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

