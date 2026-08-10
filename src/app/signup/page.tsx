import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "../../components/auth-form.tsx";
import { getOptionalCurrentUserFromCookieHeader } from "../../lib/auth/current-user.ts";

export default async function SignupPage() {
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
        <p className="eyebrow">Get started</p>
        <h1>Create your account</h1>
        <p className="auth-card__intro">
          We’ll create your first workspace automatically.
        </p>
        <AuthForm mode="signup" />
        <p className="auth-card__switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
