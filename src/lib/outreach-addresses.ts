export function normalizeWhatsAppRecipientAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const hasPlusPrefix = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^\d]/g, "");

  if (!digitsOnly) return "";
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
}

export function normalizeEmailRecipientAddress(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRecipientAddressByChannel(
  channel: "whatsapp" | "email",
  value: string,
) {
  return channel === "whatsapp"
    ? normalizeWhatsAppRecipientAddress(value)
    : normalizeEmailRecipientAddress(value);
}
