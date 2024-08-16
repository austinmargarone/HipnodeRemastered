"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/form/Input";
import { Button } from "@/components/ui/Button";
import { Divider } from "@mui/material";
import FillIcon from "../icons/FillIcon";

interface FormData {
  email: string;
  password: string;
}

const SignIn: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [failedLogin, setFailedLogin] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const validateForm = (): boolean => {
    return formData.email !== "" && formData.password !== "";
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      setFailedLogin(true);
      return;
    }

    try {
      const response = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (response?.error) {
        setFailedLogin(true);
      } else {
        router.push("/home"); // Redirect to the homepage after successful sign-in
      }
    } catch (error) {
      console.log("Sign in error:", error);
      setFailedLogin(true);
    }
  };

  return (
    <form
      onSubmit={handleSignIn}
      className="mx-auto flex w-[327px] flex-col gap-5 sm:w-[442px]"
    >
      <h1 className="h3-semibold text-secondary2 dark:text-background2">
        Sign In
      </h1>

      {failedLogin && (
        <p className="text-red">
          Email or Password is incorrect. Please try again.
        </p>
      )}

      <div>
        <Input
          name="email"
          type="email"
          divClassName="bg-background rounded-lg px-5 py-[13px] md:bg-background2 md:dark:bg-dark2 dark:bg-dark3"
          className="w-full bg-transparent md:text-secondary2 md:placeholder:text-secondary2 md:dark:text-background2 "
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
        />
      </div>

      <div>
        <Input
          name="password"
          type="password"
          divClassName="bg-background rounded-lg px-5 py-[13px] md:bg-background2 md:dark:bg-dark2 dark:bg-dark3"
          className="w-full bg-transparent md:text-secondary2 md:placeholder:text-secondary2 md:dark:text-background2 "
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
      </div>

      <Button
        type="submit"
        className="flex h-[46px] w-[127px] items-center justify-center"
      >
        Sign In
      </Button>

      <p className="body-regular text-secondary2 dark:text-background2">
        Don&apos;t have an account yet?{" "}
        <Link href="/sign-up">
          <span className="font-semibold text-red80">Join the community!</span>
        </Link>
      </p>

      <div className="w-full">
        <Divider />
      </div>

      <div className="flex w-full flex-col gap-5">
        <Button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          full
          color="gray"
          className="display-semibold items-center justify-center py-3 md:bg-secondary6"
        >
          <FillIcon.Google className="fill-secondary2 dark:fill-background2" />
          <p>Sign In With Google</p>
        </Button>
        <Button
          onClick={() => signIn("github", { callbackUrl: "/" })}
          full
          color="gray"
          className="display-semibold items-center justify-center py-3 md:bg-secondary6"
        >
          <FillIcon.GitHub className="fill-secondary2 dark:fill-background2" />
          <p>Sign In With GitHub</p>
        </Button>
      </div>
    </form>
  );
};

export default SignIn;
