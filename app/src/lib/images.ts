"use client";

/**
 * Client-side photo prep: decode (iPad HEIC included — Safari decodes
 * natively), downscale to maxDim, re-encode as JPEG for upload.
 */
export async function prepareImage(file: File, maxDim = 2048): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))),
      "image/jpeg",
      0.86,
    );
  });
}
