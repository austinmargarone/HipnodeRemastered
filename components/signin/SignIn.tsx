"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

const SignIn = () => {
  const router = useRouter();
  const { isConnected } = useAccount();

  React.useEffect(() => {
    if (isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  return (
    <article className="mx-auto flex w-[327px] flex-col gap-[29px] sm:w-[442px] md:my-auto">
      <div className="flex w-full flex-col gap-5">
        <h1 className="h3-semibold text-secondary2 dark:text-background2">
          Connect Your Wallet
        </h1>
        <p className="body-regular text-secondary2 dark:text-background2">
          To access Hipnode, please connect your wallet using the button below.
        </p>
      </div>
      <div className="mb-5 flex justify-center">
        <w3m-button />
      </div>
    </article>
  );
};

export default SignIn;
