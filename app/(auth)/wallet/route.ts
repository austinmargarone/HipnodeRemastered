import { NextResponse } from "next/server";
import { verifyMessage } from "ethers";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongooseConnect";

export async function POST(request: Request) {
  const { address, signature, message } = await request.json();

  try {
    // Verify the signature
    const recoveredAddress = verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Connect to the database
    await dbConnect();

    // Find or create the user
    let user = await UserModel.findOne({ walletAddress: address });

    if (!user) {
      user = await UserModel.create({
        walletAddress: address,
        username: `user_${address.slice(0, 6)}`,
        // Add any other fields you want to initialize
      });
    }

    // Here you would typically create a session or JWT token
    // For simplicity, we're just returning a success message
    return NextResponse.json({ success: true, userId: user._id });
  } catch (error) {
    console.error("Error during wallet authentication:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
