import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { ETH_CHAINS } from "./network";

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined in the environment. Please check your .env file."
  );
}

export const metadata = {
  name: "Hipnode",
  description: "Modern Social Media Forum Web App",
  url: "https://your-website-url.com", // Replace with your actual website URL
  icons: ["https://your-icon-url.com"], // Replace with your actual icon URL
};

export const config = defaultWagmiConfig({
  chains: ETH_CHAINS,
  projectId,
  metadata,
  ssr: true,
  auth: {
    email: true,
    socials: ["google", "github"], // Add or remove social providers as needed
    showWallets: true,
    walletFeatures: true,
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
});
