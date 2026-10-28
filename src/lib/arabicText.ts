export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه")
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0)))
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
