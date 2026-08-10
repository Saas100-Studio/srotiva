"use client";

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button
      className="button button--ghost"
      type="button"
      disabled={pending}
      onClick={logout}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
