//features/authentication.tsx
import { getAuthData } from "../api/auth";
import { loginWithGoogle } from "../api/auth";
import React from "react";
export default function SignInPage() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
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
