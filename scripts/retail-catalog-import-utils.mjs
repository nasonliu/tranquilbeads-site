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

export function resumableManifestPrefix(existingImages, preparedImages, altForIndex) {
  const comparableCount = Math.min(existingImages.length, preparedImages.length);
  for (let index = 0; index < comparableCount; index += 1) {
    const existing = existingImages[index];
    const prepared = preparedImages[index];
    const expected = altForIndex(index);
    if (
      Number(existing.position) !== index
      || existing.alt_en !== expected.altEn
      || existing.alt_ar !== expected.altAr
      || existing.sha256 !== prepared.sha256
    ) {
      throw new Error(`Existing gallery image ${index + 1} is not an exact manifest match`);
    }
  }
  return comparableCount;
}
