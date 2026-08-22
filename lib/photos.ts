"use client";

import { supabase } from "./supabase";
import { prepareImage } from "./image";

const BUCKET = "dish-photos";

export function publicPhotoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Shrinks the file in the browser, uploads it, and returns its storage path. */
export async function uploadDishPhoto(
  dishId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const prepared = await prepareImage(file);
  // Timestamped rather than a stable name per dish: overwriting in place would
  // leave the old image cached at the same public URL, so a replaced photo
  // would keep showing the meal before it.
  const path = `${dishId}/${Date.now()}.${prepared.ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, prepared.blob, { contentType: prepared.contentType });

  return error ? { error: error.message } : { path };
}

/**
 * Best-effort cleanup after a photo is replaced or a write-up is cleared.
 *
 * Deliberately not awaited for correctness: the row has already been updated to
 * stop pointing at this file, so a failed delete leaves an orphan in the bucket
 * rather than a broken image on the page. Not worth failing a save over.
 */
export function forgetDishPhoto(path: string | null): void {
  if (!path) return;
  void supabase.storage.from(BUCKET).remove([path]);
}
