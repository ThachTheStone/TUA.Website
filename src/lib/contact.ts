/** Vietnamese mobile number → Zalo chat link (Zalo uses the phone number as the id). */
export function zaloUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? `https://zalo.me/${digits}` : null;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** "0868296939" → "0868 296 939"; anything else is returned as typed. */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}
