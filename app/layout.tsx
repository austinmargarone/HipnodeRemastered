import React from "react";

import { getServerSession } from "next-auth";

import type { Metadata } from "next";
// eslint-disable-next-line camelcase
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";


// Add Spline import (note: we're not using '/next' here)
const SplineScene = dynamic(() => import('@/components/SplineScene'), { ssr: false });

const ThirdwebProviderWrapper = dynamic(
  () => import('../components/ThirdwebProviderWrapper'),
  { ssr: false }
);

const SourceSansPro = Source_Sans_3({ subsets: ["latin"] });
const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export const metadata: Metadata = {
  title: "Hipnode",
  description: "Modern Social Media Forum Web App",
  keywords: ["Next.js", "React", "JavaScript", "Developer"],
  openGraph: {
    images: [
      {
        url: `${baseURL}/meta.png`,
        width: 1200,
        height: 630,
        alt: "Hipnode",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(SourceSansPro.className, "bg-bkg relative")}>
        <ThirdwebProviderWrapper>
          <Providers>{children}</Providers>
          <Toaster />
        </ThirdwebProviderWrapper>
      </body>
    </html>
  );
}