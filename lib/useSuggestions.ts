"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Suggestion } from "./database.types";

/**
 * The pending queue. RLS restricts SELECT on suggestions to the author, so for
 * anyone else this simply comes back empty rather than erroring — the box is
 * write-only to the public by design.
 */
export function useSuggestions(enabled: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    // Same reason as usePlaces: a request that never reaches a server rejects
    // rather than returning an error, and an uncaught rejection would leave the
    // queue on "Loading…" indefinitely.
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setSuggestions(error ? [] : ((data ?? []) as Suggestion[]));
    } catch {
      setSuggestions([]);
    }
  }, [enabled]);

  useEffect(() => {
    // Awaited rather than called bare — see the note in useVerdicts.
    void (async () => {
      await load();
    })();
  }, [load]);

  // Derived rather than cleared in the effect: turning the hook off should hide
  // the queue immediately, not on the next render after a state write.
  return { suggestions: enabled ? suggestions : null, reload: load };
}
