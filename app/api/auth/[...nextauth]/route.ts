import { NextRequest, NextResponse } from 'next/server';
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
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

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const verifiedPayload = await thirdwebAuth.verifyPayload(payload);

    if (!verifiedPayload.valid) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 401 });
    }

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

    return NextResponse.json({ success: true, jwt }, { status: 200 });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Auth endpoint is working' }, { status: 200 });
}
