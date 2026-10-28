import type { DoorModel } from "../types/model";
import { normalizeSearch } from "./arabicText";

/** Display-only identity. Never overwrites the saved marketing name or model ID. */
export function doorType(model: Pick<DoorModel, "category">, categoryLabel = ""): string {
  const label = normalizeSearch(categoryLabel);
  const id = normalizeSearch(model.category || "");
  if (label.includes("قواطع") || id === "partitions") return label.includes("داخلي") || id === "partitions" ? "قاطع داخلي" : "قاطع";
  if (label.includes("داخلي") || ["interior", "internal", "داخلي"].includes(id)) return "باب داخلي";
  if (label.includes("خارجي") || ["exterior", "external", "خارجي"].includes(id)) return "باب خارجي";
  return categoryLabel.trim() || "باب";
}

export function doorName(model: Pick<DoorModel, "category" | "material" | "color" | "modelNumber">, categoryLabel = ""): string {
  const parts = [doorType(model, categoryLabel), model.material?.trim(), model.color?.trim() ? `لون ${model.color.trim()}` : ""];
  const name = parts.filter(Boolean).join(" ");
  const code = String(model.modelNumber ?? "").trim();
  return code ? `${name} – موديل ${code}` : name;
}
