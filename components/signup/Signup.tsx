"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

import { newUser } from "@/utils/actions/user.action";
import { emailSchema, passwordSchema } from "@/lib/validations";
import { ZodError } from "zod";

import { Input } from "@/components/form/Input";
import { Button } from "@/components/ui/Button";
import { Divider } from "@mui/material";
import FillIcon from "../icons/FillIcon";

interface FormData {
  username: string;
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  username?: string;
}

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.username) {
      newErrors.username = "Username is required";
    }
    try {
      emailSchema.parse(formData.email);
    } catch (error) {
      if (error instanceof ZodError) {
        newErrors.email = error.errors[0]?.message;
      }
    }
    try {
      passwordSchema.parse(formData.password);
    } catch (error) {
      if (error instanceof ZodError) {
        newErrors.password = error.errors[0]?.message;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const newFormData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        newFormData.append(key, value);
      });

      const data = await newUser(newFormData);

      if (data.status === "success") {
        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          callbackUrl: "/home",
        });
      } else {
        // Handle unsuccessful sign up
        console.error("Sign up failed:", data.message);
        setErrors({ username: data.message });
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setErrors({
        username: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSignUp}
      className="mx-auto flex w-[327px] flex-col gap-5 sm:w-[442px]"
    >
      <h1 className="h3-semibold text-secondary2 dark:text-background2">
        Sign Up
      </h1>

      <div>
        <Input
          name="username"
          type="username"
          divClassName="bg-background rounded-lg px-5 py-[13px] md:bg-background2 md:dark:bg-dark2 dark:bg-dark3"
          className="w-full bg-transparent md:text-secondary2 md:placeholder:text-secondary2 md:dark:text-background2 "
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        {errors.username && <p className="text-red">{errors.username}</p>}
      </div>

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
        {errors.email && <p className="text-red">{errors.email}</p>}
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
        {errors.password && <p className="text-red">{errors.password}</p>}
      </div>

      <Button
        type="submit"
        className="flex h-[46px] w-[127px] items-center justify-center"
      >
        Sign Up
      </Button>

      <p className="body-regular text-secondary2 dark:text-background2">
        Already have an account?{" "}
        <Link href="/sign-in">
          <span className="font-semibold text-red80">Sign in</span>
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

          <p>Sign In With Github</p>
        </Button>
      </div>
    </form>
  );
};

export default SignUp;
