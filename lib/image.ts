const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export type PreparedImage = {
  blob: Blob;
  contentType: string;
  ext: string;
  /** False when the browser could not decode the file and we sent it as-is. */
  resized: boolean;
};

/**
 * Shrink a photo in the browser before upload. There is no server to do it, and
 * a raw 4MB phone photo per rating would chew through the free storage tier and
 * make the detail panel crawl.
 *
 * iPhones shoot HEIC by default. Safari can decode it here; desktop Chrome and
 * Firefox cannot, and createImageBitmap simply rejects. That is a rare path —
 * photos come off phones at the table — so it falls back to uploading the
 * original rather than blocking the rating.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("encode failed");

    return { blob, contentType: "image/jpeg", ext: "jpg", resized: true };
  } catch {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    return {
      blob: file,
      contentType: file.type || "application/octet-stream",
      ext,
      resized: false,
    };
  }
}
