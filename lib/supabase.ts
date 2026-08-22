"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Static export inlines these at build time, so a missing value produces a
  // site that silently renders an empty map. Failing loudly is better.
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in .env.local locally, or as repo variables in GitHub Actions.",
  );
}

export const supabase = createClient(url, anonKey);

/**
 * A message worth showing someone.
 *
 * supabase-js returns `{ error }` for anything the server answered, but a
 * request that never reached a server — no signal, DNS failure, the project
 * paused — rejects instead, with fetch's famously unhelpful "Failed to fetch".
 * Callers have to catch that themselves or the promise dies silently and the
 * page waits forever; this turns whatever they caught into a sentence.
 */
export function describeError(thrown: unknown): string {
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return /failed to fetch|networkerror|load failed/i.test(message)
    ? "Couldn't reach the database. Check your connection and try again."
    : message;
}

/**
 * Supabase returns HTTP 401 for a row-level-security denial, the same status it
 * uses for an expired session. Treating every 401 as "logged out" would bounce a
 * signed-in user to the login screen when they were merely not allowed to do
 * something. Postgres error code 42501 is the reliable signal.
 */
export function isPermissionDenied(error: { code?: string } | null): boolean {
  return error?.code === "42501";
}
