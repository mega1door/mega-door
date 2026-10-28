import type { DoorModel } from "../types/model";
import { normalizeSearch } from "./arabicText";
import { doorName } from "./doorIdentity";
export { normalizeSearch } from "./arabicText";

/** Every query token must match. Numeric code segments match exactly, not 205 -> 1205. */
export function searchModels(models: DoorModel[], query: string, categories: { id: string; label: string }[] = []): DoorModel[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const labels = new Map(categories.map((category) => [category.id, category.label]));
  return models.filter((model) => {
    const fields = [model.name, model.modelNumber, model.colorCode, model.material, model.color, model.category, labels.get(model.category), doorName(model, labels.get(model.category))]
      .map((value) => normalizeSearch(value || ""));
    return tokens.every((token) => fields.some((field) => /^\d+$/.test(token)
      ? field.split(/\D+/).includes(token)
      : field.replace(/\s/g, "").includes(token)));
  });
}
