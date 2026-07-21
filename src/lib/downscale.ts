import type { ImageInput } from "./extraction/extract";

const MAX_EDGE = 1568;

/** Downscale a dropped file to Claude's vision sweet spot and return base64. */
export async function fileToImageInput(file: File): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}
