import { getCsrfToken, signIn, signOut, getSession } from "next-auth/react";
import type {
  SIWEVerifyMessageArgs,
  SIWECreateMessageArgs,
  SIWESession,
} from "@web3modal/siwe";
import { createSIWEConfig, formatMessage } from "@web3modal/siwe";
import { mainnet, sepolia, polygon, optimism, arbitrum } from "viem/chains";

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => {
    const host =
      typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    return {
      domain: host,
      uri: origin,
      chains: [mainnet.id, sepolia.id, polygon.id, optimism.id, arbitrum.id],
      statement: "Sign in to Hipnode",
    };
  },
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
    formatMessage(args, address),
  getNonce: async () => {
    const nonce = await getCsrfToken();
    if (!nonce) {
      throw new Error("Failed to get nonce!");
    }
    return nonce;
  },
  getSession: async () => {
    const session = await getSession();
    if (!session) {
      throw new Error("Failed to get session!");
    }
    const { address, chainId } = session as unknown as SIWESession;
    return { address, chainId };
  },
  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    try {
      console.log("Attempting to verify message:", { message, signature });
      const result = await signIn("credentials", {
        message,
        redirect: false,
        signature,
        callbackUrl: "/home",
      });
      console.log("SignIn result:", result);
      if (result?.error) {
        console.error("SIWE verification failed:", result.error);
        return false;
      }
      return result?.ok ?? false;
    } catch (error) {
      console.error("SIWE verification error:", error);
      return false;
    }
  },
  signOut: async () => {
    try {
      await signOut({
        redirect: false,
      });
      return true;
    } catch (error) {
      console.error("SIWE sign out error:", error);
      return false;
    }
  },
});
