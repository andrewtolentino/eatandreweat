"use client";

import { supabase } from "./supabase";
import { prepareImage } from "./image";

const BUCKET = "place-photos";

export function publicPhotoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Shrinks the file in the browser, uploads it, and returns its storage path. */
export async function uploadPlacePhoto(
  placeId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const prepared = await prepareImage(file);
  // Timestamped rather than a stable name per dish: overwriting in place would
  // leave the old image cached at the same public URL, so a replaced photo
  // would keep showing the meal before it.
  const path = `${placeId}/${Date.now()}.${prepared.ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, prepared.blob, { contentType: prepared.contentType });

  return error ? { error: error.message } : { path };
}

/**
 * Upload several at once, in the order given.
 *
 * Sequential rather than parallel: these come off a phone at several megabytes
 * each, and a handful of simultaneous uploads on a restaurant's wifi is how you
 * get a timeout instead of a photo. Stops at the first failure and reports what
 * did land, so a partial batch is still saveable.
 */
export async function uploadPlacePhotos(
  placeId: string,
  files: File[],
): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = [];

  for (const file of files) {
    const result = await uploadPlacePhoto(placeId, file);
    if ("error" in result) return { paths, error: result.error };
    paths.push(result.path);
  }

  return { paths };
}

/**
 * Best-effort cleanup after photos are removed or a write-up is cleared.
 *
 * Deliberately not awaited for correctness: the row has already been updated to
 * stop pointing at these files, so a failed delete leaves an orphan in the
 * bucket rather than a broken image on the page. Not worth failing a save over.
 */
export function forgetPlacePhotos(paths: (string | null)[]): void {
  const real = paths.filter((p): p is string => Boolean(p));
  if (real.length === 0) return;
  void supabase.storage.from(BUCKET).remove(real);
}
