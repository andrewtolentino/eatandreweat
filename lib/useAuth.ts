"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Stored with the id it was checked for, so signing out — or signing in as
  // something else — cannot leave a stale `true` behind for the frame before
  // the next check lands.
  const [checked, setChecked] = useState<{
    userId: string;
    isAuthor: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      // Whatever happened, stop waiting. SignIn renders nothing at all while
      // `loading` is true, so a rejected session lookup would take the sign-in
      // button off the page rather than merely failing to sign anyone in.
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const userId = user.id;

    // Asking the database rather than trusting anything the client holds. The
    // same function backs every write policy, so the interface and the
    // enforcement can never disagree about who the author is — the worst a
    // tampered client can do is show buttons whose writes then fail.
    // An async IIFE rather than .then().catch(): the query builder supabase.rpc
    // returns is a thenable, not a real Promise, so there is no .catch to hang
    // off it. try/await gets the same guarantee.
    void (async () => {
      let isAuthor = false;
      try {
        const { data } = await supabase.rpc("is_author");
        isAuthor = data === true;
      } catch {
        // Unreachable is not the same as authorised. Falling back to false
        // shows the read-only view — wrong but harmless, and the write
        // policies would reject anything the buttons tried anyway.
      }
      if (!cancelled) setChecked({ userId, isAuthor });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user,
    isAuthor: Boolean(user && checked?.userId === user.id && checked.isAuthor),
    loading,
    signOut,
  };
}
