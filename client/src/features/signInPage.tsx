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

      return { token };
    } catch (err) {
      await removeAuth();
      throw err;
    }
  };

  return (
    <div className="p-4 w-80 bg-white">
      <button
        onClick={handleLogin}
        className="bg-gray-200 hover:bg-gray-300 text-black font-semibold p-2 rounded w-full mb-2 transition"
      >
        Login with Google
      </button>
    </div>
  );
}
