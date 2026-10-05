"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AuthFormProps = {
  mode: "login" | "signup";
};

type ApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const body = {
      email: form.get("email"),
      password: form.get("password"),
      ...(isSignup ? { name: form.get("name") } : {}),
    };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ApiErrorBody;

      if (!response.ok) {
        const fieldMessage = Object.values(result.error?.details ?? {}).find(
          (value): value is string => typeof value === "string",
        );
        setError(
          fieldMessage ?? result.error?.message ?? "Unable to continue.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach Srotiva. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {isSignup ? (
        <label>
          <span>Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
          />
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {error ? (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={pending}>
        {pending
          ? "Please wait…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
