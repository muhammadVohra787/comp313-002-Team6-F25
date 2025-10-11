//features/authentication.tsx
import { removeAuth, setAuthData } from "../api/auth";
import React from "react";
import { apiPost } from "../api/base";
import { AuthResponse } from "../models/userModel";
import { SetAttentionItem } from "../types";

export default function SignInPage({
  setAttentionItem,
}: {
  setAttentionItem: SetAttentionItem;
}) {
  const handleLogin = async () => {
    try {
      const googleToken = await chrome.identity.getAuthToken({
        interactive: true,
      });
      console.log(googleToken);
      if (!googleToken || !googleToken?.token)
        throw new Error("No token received from Google");

      const response: AuthResponse = await apiPost("/auth/google", {
        token: googleToken?.token,
      });

      await setAuthData(response);
      setAttentionItem("profile", response.user.attention_needed);
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
