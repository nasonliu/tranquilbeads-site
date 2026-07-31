export function manifestFirstImageOrder(existingImages, manifestImages) {
  const existingById = new Map(existingImages.map((image) => [image.id, image]));
  const manifestIds = new Set();
  const verifiedManifest = manifestImages.map((image) => {
    if (manifestIds.has(image.id)) throw new Error("Duplicate manifest image readback");
    manifestIds.add(image.id);
    const existing = existingById.get(image.id);
    if (!existing || existing.url !== image.url) throw new Error("Manifest image readback mismatch");
    return existing;
  });
  return [...verifiedManifest, ...existingImages.filter((image) => !manifestIds.has(image.id))];
}
