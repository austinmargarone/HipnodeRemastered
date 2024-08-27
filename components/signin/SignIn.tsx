"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectEmbed, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

import { generatePayload, isLoggedIn, login, logout } from "../../actions/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export const config = {
  matcher: [
    "/home",
    "/meetups",
    "/groups",
    "/podcasts",
    "/interviews",
    "/profile/:path*",
    "/info",
    "/",
    "/sign-in",  // Add this to handle the sign-in page
  ],
};

const SignIn: React.FC = () => {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const account = useActiveAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const client = React.useMemo(() => {
    if (!CLIENT_ID) {
      console.error("NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set in the environment variables");
      return null;
    }
    return createThirdwebClient({ clientId: CLIENT_ID });
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const loggedIn = await isLoggedIn();
    console.log("Is user logged in?", loggedIn);
    setIsAuthenticated(loggedIn);
    return loggedIn;
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, attempting to redirect to /home");
      try {
        router.push("/home");
        console.log("Redirection to /home initiated");
      } catch (error) {
        console.error("Error during redirection:", error);
      }
    }
  }, [isAuthenticated, router]);

  const handleConnect = useCallback(async (wallet: any) => {
    console.log("Wallet connected:", wallet);
    try {
      console.log("Checking auth status...");
      const loggedIn = await checkAuthStatus();
      console.log("Is user logged in?", loggedIn);
      if (loggedIn) {
        console.log("User is already logged in, redirecting to /home");
        router.push("/home");
      } else {
        console.log("User is not logged in, waiting for login...");
      }
    } catch (error) {
      console.error("Error in handleConnect:", error);
      setLoginError("Failed to connect wallet. Please try again.");
    }
  }, [checkAuthStatus, router]);

  const handleLogin = useCallback(async (params: any) => {
    console.log("Logging in with params:", JSON.stringify(params, null, 2));
    try {
      const result = await login(params);
      console.log("Login result:", result);
      if (result.success) {
        console.log("Login successful, setting authenticated state");
        setIsAuthenticated(true);
        console.log("Attempting manual redirection to /home");
        router.push("/home");
      } else {
        console.error("Login failed:", result.error);
        setLoginError(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setLoginError("An error occurred during login. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        console.log("User is already logged in, redirecting to /home");
        router.push("/home");
      }
    };
    checkLoginStatus();
  }, [router]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        console.log("User is already logged in, redirecting to /home");
        router.push("/home");
      }
    };
    checkLoginStatus();
  }, [router]);

  if (!client) {
    return <p>Error: Unable to initialize Thirdweb client. Please check your environment variables.</p>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="mb-6 text-2xl font-semibold text-secondary2">
            Connect Your Wallet
          </h2>

          {loginError && (
            <p className="mb-4 text-red-500">{loginError}</p>
          )}

          <ConnectEmbed
            client={client}
            onConnect={handleConnect}
            auth={{
              isLoggedIn: async (address) => {
                console.log("Checking if logged in:", address);
                return await isLoggedIn();
              },
              doLogin: handleLogin,
              getLoginPayload: async ({ address }) => generatePayload({ address }),
              doLogout: async () => {
                console.log("Logging out");
                await logout();
                setLoginError(null);
                setIsAuthenticated(false);
              },
            }}
            chain={baseSepolia}
            theme="dark"
            privacyPolicyUrl="/privacy"
            termsOfServiceUrl="/terms"
            showAllWallets={true}
            header={{
              title: "Connect to Node Social",
            }}
          />

          <p className="mt-6 text-sm text-secondary2">
            By connecting your wallet, you agree to our{" "}
            <Link href="/terms" className="text-red80 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-red80 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          {isAuthenticated && (
            <button
              onClick={() => router.push("/home")}
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded"
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignIn;