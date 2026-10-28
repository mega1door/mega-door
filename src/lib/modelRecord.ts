import type { DoorModel } from "../types/model";
import { doorName } from "./doorIdentity";

export const MODEL_COLUMNS = "id,model_number,name,category,material,color,color_code,dimensions,specs,usage,images,is_popular,style_label,accent,price";

export type ModelRow = {
  id: string;
  model_number: string;
  name: string;
  category: string;
  material: string | null;
  color: string | null;
  color_code?: string | number | null;
  dimensions: string | null;
  specs: string[] | null;
  usage: string | null;
  images: string[] | null;
  is_popular: boolean;
  style_label: string | null;
  accent: string | null;
  price: number | null;
};

export function rowToModel(row: ModelRow): DoorModel {
  return {
    id: row.id,
    modelNumber: row.model_number,
    name: row.name,
    category: row.category,
    material: row.material ?? undefined,
    color: row.color ?? undefined,
    colorCode: row.color_code == null ? undefined : String(row.color_code),
    dimensions: row.dimensions ?? undefined,
    specs: row.specs ?? undefined,
    usage: row.usage ?? undefined,
    images: row.images ?? [],
    isPopular: row.is_popular,
    accent: row.accent ?? undefined,
    styleLabel: row.style_label ?? undefined,
    price: row.price ?? undefined,
  };
}

export function modelToRow(data: Omit<DoorModel, "id">) {
  return {
    model_number: data.modelNumber,
    name: data.name.trim() || doorName(data),
    category: data.category,
    material: data.material || null,
    color: data.color || null,
    ...(data.colorCode !== undefined ? { color_code: data.colorCode.trim() || null } : {}),
    dimensions: data.dimensions || null,
    specs: data.specs && data.specs.length > 0 ? data.specs : null,
    usage: data.usage || null,
    images: data.images,
    is_popular: data.isPopular,
    accent: data.accent || null,
    style_label: data.styleLabel || null,
    price: data.price ?? null,
  };
}
