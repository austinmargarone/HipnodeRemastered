"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config, projectId, metadata } from "../app/wagmi";
import { SocketProvider } from "@/providers/SocketProvider";
import { PodcastProvider } from "@/providers/PodcastProvider";
import { siweConfig } from "@/lib/siweConfig";

const queryClient = new QueryClient();

if (typeof projectId !== "string") {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined");
}

// Create modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  metadata,
  enableAnalytics: true,
  siweConfig,
  themeVariables: {
    "--w3m-color-mix": "#7F25B3",
    "--w3m-color-mix-strength": 40,
    "--w3m-accent": "#3FA2EE",
    "--w3m-font-family": "Inter, sans-serif",
  },
});

const PageWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <PodcastProvider>
            <main className="my-5 bg-bkg text-defaultText">
              <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-5 px-5 sm:px-10 md:flex-row">
                {children}
              </div>
            </main>
          </PodcastProvider>
        </SocketProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default PageWrapper;
