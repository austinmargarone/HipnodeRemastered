import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "";

const client = createThirdwebClient({ clientId });

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

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
  ],
};

export async function middleware(request: NextRequest) {
  console.log("Middleware running for path:", request.nextUrl.pathname);
  const url = request.nextUrl.clone();

  const jwt = request.cookies.get("jwt");
  let isLoggedIn = false;

  if (jwt) {
    try {
      const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
      isLoggedIn = authResult.valid;
      console.log("JWT verification result:", authResult);
    } catch (error) {
      console.error("Error verifying JWT:", error);
    }
  }

  console.log("Middleware - Is user logged in?", isLoggedIn);

  if (!isLoggedIn && url.pathname !== "/sign-in") {
    console.log("User not logged in, redirecting to /sign-in");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (isLoggedIn && url.pathname === "/sign-in") {
    console.log("User is logged in and on /sign-in, redirecting to /home");
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (url.pathname === "/") {
    console.log("Root path detected, redirecting to /home");
    return NextResponse.redirect(new URL("/home", request.url));
  }

  console.log("Middleware - Allowing access to:", url.pathname);
  return NextResponse.next();
}