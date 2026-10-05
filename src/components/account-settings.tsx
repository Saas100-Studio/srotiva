"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { changeAccountPassword, ClientApiError, deleteAccount } from "../lib/client/api-client.ts";

function requestMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AccountSettings({ email }: { email: string }) {
  const router = useRouter();
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPasswordPending(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      await changeAccountPassword(
        String(data.get("currentPassword") ?? ""),
        String(data.get("newPassword") ?? ""),
      );
      form.reset();
      setPasswordMessage("Password changed successfully.");
    } catch (error) {
      setPasswordError(requestMessage(error, "Unable to change your password."));
    } finally {
      setPasswordPending(false);
    }
  }

  async function submitDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const confirmation = String(data.get("confirmation") ?? "");
    if (confirmation !== "DELETE") {
      setDeletionError("Type DELETE exactly to confirm.");
      return;
    }
    if (!window.confirm(`Permanently delete ${email}, its workspace, feeds, and feed items? This cannot be undone.`)) return;

    setDeletionPending(true);
    setDeletionError(null);
    try {
      await deleteAccount(String(data.get("password") ?? ""), confirmation);
      router.replace("/");
      router.refresh();
    } catch (error) {
      const message = requestMessage(error, "Unable to delete your account.");
      setDeletionError(
        error instanceof ClientApiError && error.code === "ACCOUNT_DELETION_REQUIRES_SUPPORT"
          ? `${message} Contact support for a safe ownership transfer.`
          : message,
      );
      setDeletionPending(false);
    }
  }

  return (
    <div className="account-settings-grid">
      <section className="feed-detail-card" aria-labelledby="password-heading">
        <h2 id="password-heading">Change password</h2>
        <form className="auth-form" onSubmit={submitPassword}>
          <label>
            <span>Current password</span>
            <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} />
          </label>
          <label>
            <span>New password</span>
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
          </label>
          <button className="button" type="submit" disabled={passwordPending}>
            {passwordPending ? "Changing…" : "Change password"}
          </button>
          {passwordMessage ? <p role="status" className="account-success">{passwordMessage}</p> : null}
          {passwordError ? <p role="alert" className="form-error">{passwordError}</p> : null}
        </form>
      </section>

      <section className="feed-detail-card" aria-labelledby="export-heading">
        <h2 id="export-heading">Export your data</h2>
        <p>Download a JSON copy of your account, workspace, feeds, items, filters, refresh history, and audit history.</p>
        <a className="button button--ghost" href="/api/account/export" download>Download data export</a>
      </section>

      <section className="feed-detail-card account-danger-zone" aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete account</h2>
        <p>Permanently deletes your account and its sole-owner workspace, including every feed and item. This cannot be undone.</p>
        <form className="auth-form" onSubmit={submitDeletion}>
          <label>
            <span>Current password</span>
            <input name="password" type="password" autoComplete="current-password" required maxLength={128} />
          </label>
          <label>
            <span>Type DELETE to confirm</span>
            <input name="confirmation" type="text" autoComplete="off" required pattern="DELETE" />
          </label>
          <button className="button button--danger" type="submit" disabled={deletionPending}>
            {deletionPending ? "Deleting…" : "Permanently delete account"}
          </button>
          {deletionError ? <p role="alert" className="form-error">{deletionError}</p> : null}
        </form>
      </section>
    </div>
  );
}
