import { CircularProgress } from "@mui/material";

export default function CenteredCircularProgress() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
      }}
    >
      <CircularProgress />
    </div>
  );
}
