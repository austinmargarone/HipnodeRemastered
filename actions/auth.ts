"use server";

import { VerifyLoginPayloadParams, createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { cookies } from "next/headers";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongooseConnect";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "";

if (!privateKey || !clientId || !domain) {
  throw new Error("Missing environment variables");
}

const client = createThirdwebClient({ clientId });

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams) {
  console.log("Verifying payload:", JSON.stringify(payload, null, 2));
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  console.log("Verified payload:", JSON.stringify(verifiedPayload, null, 2));
  if (verifiedPayload.valid) {
    await dbConnect();
    let user = await UserModel.findOne({ address: verifiedPayload.payload.address });
    if (!user) {
      user = await UserModel.create({
        address: verifiedPayload.payload.address,
        username: `user_${verifiedPayload.payload.address.slice(0, 6)}`,
      });
    }

    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
    });

    cookies().set("jwt", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { success: true };
  }
  return { success: false, error: "Invalid payload" };
}

export async function isLoggedIn() {
  console.log("Checking if user is logged in");
  try {
    const cookieStore = cookies();
    const jwt = cookieStore.get("jwt");
    console.log("JWT cookie:", jwt ? "found" : "not found");
    if (!jwt?.value) {
      console.log("No JWT cookie found");
      return false;
    }
    console.log("Verifying JWT...");
    const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
    console.log("JWT verification result:", JSON.stringify(authResult, null, 2));
    return authResult.valid;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
}

export async function logout() {
  cookies().delete("jwt");
}