import { useSyncExternalStore } from "react";
import type { DoorModel } from "../types/model";
import { supabase } from "./supabaseClient";
import { demoModels as seedModels } from "../data/models";

/**
 * مخزن الموديلات - قاعدة بيانات Supabase حقيقية مشتركة (جدول public.models).
 * أي إضافة/تعديل/حذف من لوحة الإدارة يظهر لكل زوار الموقع الحقيقيين بعد
 * إعادة تحميل الصفحة، مو بس بمتصفح من سوّى التعديل.
 *
 * seedModels تُستخدم فقط كحالة أولية لحظية قبل اكتمال أول طلب فعلي (تفادي
 * شاشة فارغة)، وكحالة احتياطية إذا تعذّر الاتصال بقاعدة البيانات.
 */

type Listener = () => void;
let listeners: Listener[] = [];
let cache: DoorModel[] = seedModels;

type ModelRow = {
  id: string;
  model_number: string;
  name: string;
  category: string;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  specs: string[] | null;
  usage: string | null;
  images: string[] | null;
  is_popular: boolean;
  style_label: string | null;
  accent: string | null;
  price: number | null;
};

function rowToModel(row: ModelRow): DoorModel {
  return {
    id: row.id,
    modelNumber: row.model_number,
    name: row.name,
    category: row.category,
    material: row.material ?? undefined,
    color: row.color ?? undefined,
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

function modelToRow(data: Omit<DoorModel, "id">) {
  return {
    model_number: data.modelNumber,
    name: data.name,
    category: data.category,
    material: data.material || null,
    color: data.color || null,
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

function emitChange() {
  listeners.forEach((l) => l());
}

async function fetchModels(): Promise<void> {
  // فحص محلي لاختبار تجربة الزائر عند خلو الكتالوج دون المساس بقاعدة بيانات Supabase
  if (typeof window !== "undefined" && window.location.search.includes("empty=1")) {
    cache = [];
    emitChange();
    return;
  }

  const { data, error } = await supabase
    .from("models")
    .select(
      "id,model_number,name,category,material,color,dimensions,specs,usage,images,is_popular,style_label,accent,price"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("تعذّرت قراءة الموديلات من قاعدة البيانات.", error);
    return;
  }
  cache = (data ?? []).map(rowToModel);
  emitChange();
}
void fetchModels();

export function getModelsSnapshot(): DoorModel[] {
  return cache;
}

export function subscribeModels(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** يقرأ لائحة الموديلات الحالية ويعيد رسم أي مكوّن يستخدمه عند أي تعديل (إضافة/تعديل/حذف). */
export function useModels(): DoorModel[] {
  return useSyncExternalStore(subscribeModels, getModelsSnapshot, () => seedModels);
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "model";
}

function uniqueId(base: string, existing: DoorModel[]): string {
  const taken = new Set(existing.map((m) => m.id));
  let id = slugify(base);
  let i = 2;
  while (taken.has(id)) {
    id = `${slugify(base)}-${i}`;
    i++;
  }
  return id;
}

export async function addModel(data: Omit<DoorModel, "id">): Promise<DoorModel> {
  const current = getModelsSnapshot();
  const id = uniqueId(data.modelNumber || data.name, current);
  const { error } = await supabase.from("models").insert({ id, ...modelToRow(data) });
  if (error) throw error;
  await fetchModels();
  return { ...data, id };
}

export async function updateModel(id: string, data: Omit<DoorModel, "id">): Promise<void> {
  const { error } = await supabase.from("models").update(modelToRow(data)).eq("id", id);
  if (error) throw error;
  await fetchModels();
}

export async function deleteModel(id: string): Promise<void> {
  const { error } = await supabase.from("models").delete().eq("id", id);
  if (error) throw error;
  await fetchModels();
}
