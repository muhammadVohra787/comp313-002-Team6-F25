//features/authentication.tsx
import { removeAuth, setAuthData } from "../api/auth";
import React from "react";
import { apiPost } from "../api/base";

export default function SignInPage() {
  const handleLogin = async () => {
    try {
      const googleToken = await chrome.identity.getAuthToken({
        interactive: true,
      });
      if (!googleToken || !googleToken?.token)
        throw new Error("No token received from Google");

      const response = await apiPost("/auth/google", {
        token: googleToken?.token,
      });

      const { user, token } = response;

      await setAuthData(user, token);
    } catch (err) {
      await removeAuth();
      throw err;
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
}
