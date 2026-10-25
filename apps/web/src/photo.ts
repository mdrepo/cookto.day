// A receipt photo made small on the phone before it's sent (specs/129, ADR
// 0028): its longest side at most 1,600 pixels, as JPEG, under 1.5 MB, the
// most the API takes. It's drawn once and never saved.

const MAX_SIDE = 1600;
const MAX_BYTES = 1_500_000;
const QUALITIES = [0.85, 0.7, 0.55, 0.4];

/** The photo as a small JPEG; null when the phone can't read it. */
export async function shrink(file: Blob): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((done) => {
      canvas.toBlob(done, "image/jpeg", quality);
    });
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  return null;
}
