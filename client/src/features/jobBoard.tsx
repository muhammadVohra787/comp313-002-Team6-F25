import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WorkIcon from "@mui/icons-material/Work";
import SearchIcon from "@mui/icons-material/Search";
import { getWithAuth } from "../api/base";

const JobBoard = () => {
  const [jobs, setJobs] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getWithAuth("/history/unique-jobs");
        setJobs(res.unique_jobs || {});
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
        setError("Failed to load jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const openJobLink = (url: string) => {
    window.open(url, "_blank", "noreferrer");
  };

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
      </Box>
    );
  }

  if (Object.keys(jobs).length === 0) {
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
        <WorkIcon sx={{ fontSize: 48, color: "text.secondary" }} />
        <Typography variant="h6" color="text.secondary">
          No jobs available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Jobs will appear here as they are added to the system.
        </Typography>
      </Box>
    );
  }

  const filteredJobs = Object.entries(jobs).filter(([title]) =>
    title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Job Board
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Browse available opportunities
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          placeholder="Search by job title"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <List
        sx={{
          flex: 1,
          overflow: "auto",
          maxHeight: "calc(100vh - 330px)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        {filteredJobs.map(([title, url], index) => (
          <ListItem
            key={title}
            disablePadding
            secondaryAction={
              <Tooltip title="Open in new tab">
                <IconButton
                  edge="end"
                  onClick={() => openJobLink(url)}
                  sx={{
                    color: "primary.main",
                    "&:hover": {
                      bgcolor: "primary.light",
                    },
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
            sx={{
              borderBottom:
                index !== filteredJobs.length - 1 ? "1px solid" : "none",
              borderColor: "divider",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <ListItemButton onClick={() => openJobLink(url)} sx={{ py: 1.5 }}>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                    }}
                  >
                    {title}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default JobBoard;
