"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

/*
 * Password sign-in rather than magic links. Supabase's built-in mailer allows
 * only a couple of emails per hour per project, and every attempt spends one —
 * which is a bad thing to be rationing when you are standing outside a
 * restaurant trying to write up dinner. The account is created by hand in the
 * Supabase dashboard; there is deliberately no self-signup, because there is
 * exactly one person who should be able to write here.
 */
export function SignIn() {
  const { user, isAuthor, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (signInError) {
      // "Email not confirmed" means the dashboard account was created without
      // Auto Confirm ticked, which is a different fix from a wrong password.
      setError(
        /not confirmed/i.test(signInError.message)
          ? "That account still needs confirming — re-create it in Supabase with “Auto Confirm User” ticked."
          : signInError.message,
      );
      return;
    }

    setOpen(false);
    setPassword("");
  }

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-muted">
          {user.email}
          {!isAuthor && " · read only"}
        </span>
        <button
          onClick={signOut}
          className="shrink-0 rounded-md px-2 py-1 font-medium text-muted hover:bg-surface-hover hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      // self-start matters: stacked in the footer's column the button
      // stretches to full width, and a <button> centres its own text by
      // default — so "Sign in" ended up floating in the middle of the footer
      // instead of sitting under the credit line. Shrinking it to its content
      // makes text-align moot. On sm the row reverts to auto so the
      // container's items-center still applies.
      <button
        onClick={() => setOpen(true)}
        className="self-start text-xs text-muted underline decoration-border underline-offset-2 hover:decoration-foreground hover:text-foreground sm:self-auto"
      >
        Sign in
      </button>
    );
  }

  return (
    <form onSubmit={signIn} className="flex w-full flex-col gap-2 sm:w-56">
      <input
        type="email"
        required
        autoFocus
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-accent"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-md bg-accent-strong px-3 text-xs font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-9 rounded-md px-3 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
