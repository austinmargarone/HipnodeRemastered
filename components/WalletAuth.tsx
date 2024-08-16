"use client";

import { useAccount, useSignMessage } from "wagmi";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletAuth({ children }: { children: React.ReactNode }) {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();

  useEffect(() => {
    const authenticateWallet = async () => {
      if (isConnected && address) {
        try {
          // Sign a message to prove ownership of the wallet
          const message = `Welcome to Hipnode! Please sign this message to authenticate.\n\nWallet address: ${address}\nTimestamp: ${Date.now()}`;
          const signature = await signMessageAsync({ message });

          // Send the signature to your backend for verification
          const response = await fetch("/api/auth/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, signature, message }),
          });

          if (response.ok) {
            // If authentication is successful, redirect to the main page
            router.push("/dashboard");
          } else {
            console.error("Wallet authentication failed");
          }
        } catch (error) {
          console.error("Error during wallet authentication:", error);
        }
      }
    };

    authenticateWallet();
  }, [isConnected, address, signMessageAsync, router]);

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl">Welcome to Hipnode</h1>
        <p className="mb-4">Please connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
