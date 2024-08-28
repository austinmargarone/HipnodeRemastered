"use server";

import { VerifyLoginPayloadParams, createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { cookies } from "next/headers";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongooseConnect";
import { v4 as uuidv4 } from 'uuid';

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

async function createNewUser(address: string) {
  const shortAddress = address.slice(0, 6);
  
  async function generateUniqueUsername() {
    const uniqueId = uuidv4().slice(0, 8);
    const username = `user_${shortAddress}_${uniqueId}`;
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return generateUniqueUsername();
    }
    return username;
  }

  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      const username = await generateUniqueUsername();
      
      const user = await UserModel.findOneAndUpdate(
        { address },
        {
          $setOnInsert: {
            address,
            username,
            profileImage: '/user_images/profilePicture.png',
            bannerImage: '/Profilebg.png',
            pinnedGroups: [], // Initialize pinnedGroups as an empty array
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
      
      console.log("User created or found:", user);
      return user;
    } catch (error: any) {
      if (error.code === 11000) {
        console.log(`Duplicate key error (attempt ${retries + 1}), retrying user creation`);
        retries++;
      } else {
        console.error("Error in createNewUser:", error);
        throw error;
      }
    }
  }

  throw new Error("Failed to create user after maximum retries");
}

export async function login(payload: VerifyLoginPayloadParams) {
  console.log("Verifying payload:", JSON.stringify(payload, null, 2));
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  console.log("Verified payload:", JSON.stringify(verifiedPayload, null, 2));
  if (verifiedPayload.valid) {
    await dbConnect();
    let user = await UserModel.findOne({ address: verifiedPayload.payload.address });
    if (!user) {
      user = await createNewUser(verifiedPayload.payload.address);
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