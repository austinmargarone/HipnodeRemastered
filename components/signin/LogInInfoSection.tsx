"use client";
import React from "react";
import Image from "next/image"; 

import { Info } from "@/components/signup/Info";
import FillIcon from "../icons/FillIcon";
import { LuShieldCheck } from "react-icons/lu";


const LogInInfoSection = () => {
  return (
    <>
      <div className="mt-[30px] max-md:text-center md:absolute">
        <Image
          src="/nodelogoT.png" 
          alt="Logo"
          width={250} // Adjust the width as needed
          height={100} // Adjust the height as needed
          priority
        />
      </div>
      {
        <article className="mx-auto max-w-[327px] sm:max-w-[442px] md:my-auto">
          <div className="mb-10 max-w-[250px] sm:max-w-[411px]">
            <h1 className="h3-semibold text-secondary2 dark:text-background2 sm:text-[30px] sm:font-bold sm:leading-[40px]">
              Connect to Node Social
            </h1>
          </div>
          {/* Info cards */}
          <div className="flex w-full flex-col gap-5">
            <Info
              className="bg-green10"
              fillIcon={<FillIcon.Inbox className="fill-green" />}
            >
              New to Web3? Learn how to {" "}
              <a href="/web3-guide" className="text-red80">set up a wallet</a> and get started with cryptocurrency.
            </Info>
            <Info
              className="bg-yellow10"
              fillIcon={<FillIcon.Thunderbolt className="fill-yellow" />}
            >
              Ensure you're connecting to the correct network. We support {" "}
              <span className="text-red80">Base</span> and {" "}
              <span className="text-red80">Polygon</span>.
            </Info>
            <Info
              className="bg-blue10"
              fillIcon={<LuShieldCheck />}
            >
              Your security is important. Learn about {" "}
              <a href="/wallet-safety" className="text-red80">wallet safety</a> and best practices.
            </Info>
          </div>
        </article>
      }
    </>
  );
};

export default LogInInfoSection;