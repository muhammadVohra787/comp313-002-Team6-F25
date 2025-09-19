import Authentication from "./features/authentication";
import MainPage from "./features/mainPage";
import { isUserLoggedIn } from "./api/auth";
import React from "react";

export default function App() {
  const [user, setUser] = React.useState(false);
  const [response, sr] = React.useState(null);
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const isLoggedIn = await isUserLoggedIn();
        sr(isLoggedIn);
        setUser(isLoggedIn);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);
  return (
    <>
      <p>Debug: Response is {JSON.stringify(response)}</p>
      <p>User is logged in: {user ? "Yes" : "No"}</p>
      {user ? <MainPage /> : <Authentication />}
    </>
  );
}
