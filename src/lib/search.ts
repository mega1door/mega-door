import type { DoorModel } from "../types/model";

export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/ة/g, "ه")
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0)))
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Color names/codes are searched only in the real `color` text; accent is decorative. */
export function searchModels(models: DoorModel[], query: string, categories: { id: string; label: string }[] = []): DoorModel[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const labels = new Map(categories.map((category) => [category.id, category.label]));
  return models.filter((model) => {
    const fields = [model.name, model.modelNumber, model.material, model.color, model.category, labels.get(model.category)]
      .map((value) => normalizeSearch(value || "").replace(/\s/g, ""));
    return tokens.every((token) => fields.some((field) => field.includes(token)));
  });
}
