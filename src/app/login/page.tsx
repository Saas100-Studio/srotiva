import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "../../components/auth-form.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";

export default async function LoginPage() {
  const requestHeaders = await headers();
  if (await getOptionalCurrentUserFromCookieHeader(requestHeaders.get("cookie"))) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/" aria-label="Morsel home">
          <span className="brand-mark"><span /></span>
          Morsel
        </Link>
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to Morsel</h1>
        <p className="auth-card__intro">
          Access your workspace and saved feeds.
        </p>
        <AuthForm mode="login" />
        <p className="auth-card__switch">
          New to Morsel? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
