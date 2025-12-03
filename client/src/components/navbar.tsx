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
        bgcolor: "rgba(248, 250, 252, 0.8)",
        backdropFilter: "blur(10px)",
        borderRadius: 3,
        padding: "6px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {navItems.map((item) => {
        const isActive = active === item.id;
        return (
          <Tooltip key={item.id} title={item.label} placement="top" arrow>
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
                px: 0.5,
                borderRadius: 2.5,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                bgcolor: isActive ? "background.paper" : "transparent",
                color: isActive ? "primary.main" : "text.secondary",
                position: "relative",
                pointerEvents: disabled ? "none" : "auto",
                opacity: disabled ? 0.5 : 1,
                transform: isActive ? "translateY(-2px)" : "translateY(0)",
                boxShadow: isActive
                  ? "0 4px 12px rgba(79, 70, 229, 0.15)"
                  : "none",
                "&:hover": !disabled
                  ? {
                      bgcolor: isActive
                        ? "background.paper"
                        : "rgba(255, 255, 255, 0.7)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    }
                  : {},
              }}
            >
              <IconButton
                disableRipple
                size="small"
                sx={{
                  color: "inherit",
                  bgcolor: isActive ? "rgba(79, 70, 229, 0.08)" : "transparent",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: isActive
                      ? "rgba(79, 70, 229, 0.12)"
                      : "rgba(79, 70, 229, 0.06)",
                  },
                }}
              >
                <Badge
                  overlap="circular"
                  badgeContent={
                    attentionItems[item.id] ? (
                      <ErrorIcon
                        sx={{
                          fontSize: 12,
                          color: "error.main",
                          animation: "pulse 2s ease-in-out infinite",
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.5 },
                          },
                        }}
                      />
                    ) : null
                  }
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {item.icon}
                </Badge>
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 600 : 500,
                  color: "inherit",
                  fontSize: "0.75rem",
                  letterSpacing: "0.01em",
                }}
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
