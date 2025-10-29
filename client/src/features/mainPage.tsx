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
} from "@mui/material";
import DOMPurify from "dompurify";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import PlaceIcon from "@mui/icons-material/Place";
import PublicIcon from "@mui/icons-material/Public";
import LinkIcon from "@mui/icons-material/Link";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { postWithAuth } from "../api/base";
import { JobDescription } from "../models/coverLetter";

interface MainPageProps {
  isAuthenticated: boolean;
}

const descriptionContainerStyles = {
  mt: 1,
  p: 2,
  backgroundColor: "#f7f9fc",
  borderRadius: 2,
  border: "1px solid rgba(148, 163, 184, 0.25)",
  maxHeight: 300,
  overflowY: "auto" as const,
  fontSize: "0.92rem",
  lineHeight: 1.65,
  "& ul": {
    listStyleType: "disc",
    paddingLeft: 3,
    marginBottom: 1.5,
  },
  "& ol": {
    listStyleType: "decimal",
    paddingLeft: 3,
    marginBottom: 1.5,
  },
  "& li": {
    marginBottom: 0.75,
  },
  "& p": {
    marginBottom: 1.25,
  },
} as const;

export default function MainPage({ isAuthenticated }: MainPageProps) {
  const [scrapedData, setScrapedData] = useState<JobDescription | null>(null);
  const [coverLetterHtml, setCoverLetterHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [generatingCoverLetter, setGeneratingCoverLetter] =
    useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [version, setVersion] = useState<number>(0);

  // Cover letter customization options
  const [tone, setTone] = useState<string>("professional");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setCoverLetterHtml("");
    setVersion(0);
    setUserPrompt("");

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

      const result = await postWithAuth("/cover-letter", payload);
      setCoverLetterHtml(result?.html || "");
      setVersion((v) => v + 1);
    } catch (err: any) {
      setError(
        err?.message || "Failed to generate cover letter. Please try again."
      );
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleRegenerate = () => {
    if (scrapedData) {
      generateCoverLetter(scrapedData, tone, userPrompt);
    }
  };

  const handleCopyToClipboard = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = DOMPurify.sanitize(coverLetterHtml);
    const text = tempDiv.innerText;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const renderDescription = (html: string) => {
    const sanitized = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
    });
    return (
      <Box
        sx={descriptionContainerStyles}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  };

  const renderCoverLetter = () => {
    if (!isAuthenticated || !scrapedData) return null;

    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.2)",
          background:
            "linear-gradient(135deg, rgba(237,242,255,0.85), rgba(232,244,253,0.9))",
        }}
      >
        <CardContent
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <AutoAwesomeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Generated Cover Letter
                {version > 0 && (
                  <Chip
                    label={`v${version}`}
                    size="small"
                    sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                  />
                )}
              </Typography>
            </Stack>
            {coverLetterHtml && (
              <Tooltip title={copySuccess ? "Copied!" : "Copy to clipboard"}>
                <IconButton size="small" onClick={handleCopyToClipboard}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Customization Options */}
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Tone</InputLabel>
              <Select
                value={tone}
                label="Tone"
                onChange={(e) => setTone(e.target.value)}
              >
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="enthusiastic">Enthusiastic</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="formal">Formal</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              fullWidth
              placeholder="Additional instructions (optional)..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRegenerate}
              disabled={generatingCoverLetter}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              {generatingCoverLetter ? "Generating..." : "Regenerate"}
            </Button>
          </Stack>

          {coverLetterHtml ? (
            <Paper
              elevation={0}
              sx={{
                ...descriptionContainerStyles,
                maxHeight: 260,
                backgroundColor: "#ffffff",
              }}
            >
              <Box
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(coverLetterHtml, {
                    USE_PROFILES: { html: true },
                  }),
                }}
              />
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {generatingCoverLetter || loading
                ? "Generating your tailored cover letter..."
                : "Scrape a job and stay signed in to generate a cover letter."}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "100%",
        minHeight: 0,
        padding: 3,
        boxSizing: "border-box",
        background: "linear-gradient(180deg, rgba(243,246,255,0.8), #ffffff)",
        overflowY: "auto",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, rgba(129,140,248,0.25), rgba(59,130,246,0.2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
            }}
          >
            <WorkOutlineIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Job Snapshot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Instantly pull structured job details from the active tab.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          size="medium"
          onClick={handleScrape}
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: 2 }}
          startIcon={loading ? undefined : <WorkOutlineIcon />}
        >
          {loading ? "Scraping..." : "Scrape Job Details"}
        </Button>
      </Stack>

      {!isAuthenticated && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Log in with Google to generate a personalized cover letter. You can
          still review the scraped job details while logged out.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#ffffff",
          flex: scrapedData ? "initial" : 1,
          flexShrink: 0,
        }}
      >
        <CardContent
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Scraped Job Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We capture key information automatically so you can tailor your
              message.
            </Typography>
          </Box>

          {scrapedData ? (
            <Stack spacing={3}>
              {scrapedData.jobTitle && (
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: 1 }}
                  >
                    Position
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BusinessCenterIcon color="primary" fontSize="small" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {scrapedData.jobTitle}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {scrapedData.companyName && (
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: 1 }}
                  >
                    Company
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PublicIcon color="primary" fontSize="small" />
                    <Typography variant="body1">
                      {scrapedData.companyName}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {scrapedData.location && (
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: 1 }}
                  >
                    Location
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PlaceIcon color="primary" fontSize="small" />
                    <Typography variant="body1">
                      {scrapedData.location}
                    </Typography>
                  </Stack>
                </Box>
              )}

              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", letterSpacing: 1 }}
                >
                  Source & URL
                </Typography>
                <Stack
                  spacing={1}
                  direction="row"
                  alignItems="center"
                  flexWrap="wrap"
                >
                  {scrapedData.source && (
                    <Chip
                      icon={<PublicIcon fontSize="small" />}
                      label={scrapedData.source}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ borderRadius: 1.5 }}
                    />
                  )}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LinkIcon fontSize="small" color="action" />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", wordBreak: "break-all" }}
                    >
                      {scrapedData.url}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              {scrapedData.jobDescription && (
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "text.secondary", letterSpacing: 1 }}
                  >
                    Job Description
                  </Typography>
                  {renderDescription(scrapedData.jobDescription)}
                </Box>
              )}
            </Stack>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2" sx={{ maxWidth: 320 }}>
                Open a job listing (LinkedIn, Indeed, Google Jobs, etc.) and
                click "Scrape Job Details" to populate this panel with
                structured insights.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {renderCoverLetter()}
    </Box>
  );
}
