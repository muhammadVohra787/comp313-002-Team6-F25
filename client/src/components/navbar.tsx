import React from "react";
import { Box, Tooltip, IconButton, Badge, Typography } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import { NavItem } from "../types";

interface NavbarProps {
  navItems: NavItem[];
  active: string;
  attentionItems: { [key: string]: boolean };
  onClick: (id: string) => void;
  disabled?: boolean;
}

const Navbar = (props: NavbarProps) => {
  const { navItems, active, attentionItems, onClick, disabled } = props;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1,
        backgroundColor: "rgba(233, 239, 255, 0.9)",
        borderRadius: "14px",
        padding: "8px 12px",
        boxShadow: "0 10px 30px rgba(30, 64, 175, 0.18)",
        border: "1px solid rgba(100, 149, 237, 0.25)",
      }}
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        return (
          <Tooltip key={item.id} title={item.label} placement="top">
            <Box
              onClick={() => !disabled && onClick(item.id)}
              sx={{
                cursor: disabled ? "not-allowed" : "pointer",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                py: 0.5,
                borderRadius: "12px",
                transition: "all 0.2s ease",
                backgroundColor: isActive ? "rgba(255,255,255,0.85)" : "transparent",
                color: isActive ? "primary.main" : "text.secondary",
                position: "relative",
                pointerEvents: disabled ? "none" : "auto",
              }}
            >
              <IconButton
                disableRipple
                sx={{
                  color: "inherit",
                  backgroundColor: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(59,130,246,0.08)",
                  },
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
              <Typography
                variant="caption"
                sx={{ fontWeight: isActive ? 600 : 500, color: "inherit" }}
              >
                {item.label}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default Navbar;
