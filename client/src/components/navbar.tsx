import React from "react";
import { Box, Tooltip, IconButton, Badge } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ErrorIcon from "@mui/icons-material/Error";

const navItems = [
  { id: "home", label: "Homepage", icon: <HomeIcon /> },
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "profile", label: "Profile", icon: <AccountCircleIcon /> },
];

interface NavbarProps {
  active: string;
  attentionItems: { [key: string]: boolean };
  onClick: (id: string) => void;
}

const Navbar = (props: NavbarProps) => {
  const { active, attentionItems, onClick } = props;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#f7f7f9",
        borderRadius: "12px",
        padding: "6px 4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        width: "100%",
      }}
    >
      {navItems.map((item) => (
        <Tooltip key={item.id} title={item.label} placement="top">
          <IconButton
            onClick={() => onClick(item.id)}
            sx={{
              color: active === item.id ? "primary.main" : "text.secondary",
              position: "relative",
              "&:hover": { color: "primary.main" },
            }}
          >
            <Badge
              overlap="circular"
              badgeContent={
                attentionItems[item.id] ? (
                  <ErrorIcon color="error" sx={{ fontSize: 14 }} />
                ) : null
              }
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {item.icon}
            </Badge>
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
};

export default Navbar;
