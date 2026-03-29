export function applyImagesToSlots(
  existingImages: string[],
  startSlotIndex: number,
  nextImages: string[],
  totalSlots = existingImages.length,
) {
  const normalized = Array.from({ length: totalSlots }, (_, index) => existingImages[index] || "");
  const safeStart = Math.max(0, Math.min(startSlotIndex, totalSlots));
  const sanitized = nextImages.map((image) => image.trim()).filter(Boolean);

  sanitized.slice(0, Math.max(0, totalSlots - safeStart)).forEach((image, index) => {
    normalized[safeStart + index] = image;
  });

  return normalized;
}
