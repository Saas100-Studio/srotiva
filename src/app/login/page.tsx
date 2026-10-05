import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "../../components/auth-form.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage() {
  const requestHeaders = await headers();
  if (await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie"))) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/" aria-label="Srotiva home">
          Srotiva
        </Link>
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to Srotiva</h1>
        <p className="auth-card__intro">
          Access your workspace and saved feeds.
        </p>
        <AuthForm mode="login" />
        <p className="auth-card__switch">
          New to Srotiva? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
