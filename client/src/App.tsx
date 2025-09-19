import SignInPage from "./features/signInPage";
import MainPage from "./features/mainPage";
import { isUserLoggedIn } from "./api/auth";
import React from "react";

export default function App() {
  const [user, setUser] = React.useState(false);
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await isUserLoggedIn();
        setUser(isLoggedIn);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);
  return (
    <>
      <p>User is logged in: {user ? "Yes" : "No"}</p>
      {user ? <MainPage /> : <SignInPage />}
    </>
  );
}
