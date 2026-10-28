import { useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";
import { createRemoteCollection } from "./remoteCollection";

export interface DoorCategoryInfo {
  /** المعرّف = جزء الرابط، مثال: interior → /interior. لا يتغيّر بعد الإنشاء. */
  id: string;
  /** اسم القسم كما يظهر بالقائمة العلوية وعنوان الصفحة وجدول لوحة الإدارة */
  label: string;
  /** وصف قصير يظهر تحت عنوان صفحة القسم ويُستخدم كوصف SEO لها */
  description: string;
}

/**
 * مخزن الأقسام - قاعدة بيانات Supabase حقيقية مشتركة بين كل الزوار والأجهزة
 * (جدول public.categories). أي تعديل من لوحة الإدارة يظهر فوراً لكل الزوار
 * بعد إعادة تحميل الصفحة، مو بس بمتصفح من سوّى التعديل.
 *
 * يبدأ بلا أقسام افتراضية؛ حالة التحميل والفشل منفصلة عن نجاح الطلب بلا بيانات.
 */
const collection = createRemoteCollection<DoorCategoryInfo>(async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("id,label,description")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("تعذّرت قراءة الأقسام من قاعدة البيانات.", error);
    throw error;
  }
  return data ?? [];
});
export const refreshCategories = collection.refresh;
const fetchCategories = refreshCategories;
void fetchCategories();

export function getCategoriesSnapshot(): DoorCategoryInfo[] {
  return collection.getSnapshot().items;
}

export const subscribeCategories = collection.subscribe;

export function useCategories(): DoorCategoryInfo[] {
  return useSyncExternalStore(subscribeCategories, getCategoriesSnapshot, getCategoriesSnapshot);
}

export function useCategoriesStatus() {
  return useSyncExternalStore(collection.subscribe, collection.getSnapshot, collection.getSnapshot).status;
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "section";
}

/** مسارات ثابتة بالموقع لا يجوز أن يتصادم معها معرّف قسم جديد (وإلا صار غير قابل للوصول) */
const RESERVED_SLUGS = ["admin", "popular", "search", "model", "design-your-door", "faq", "reset-password"];

function uniqueId(base: string, existing: DoorCategoryInfo[]): string {
  let candidate = base;
  let n = 2;
  while (RESERVED_SLUGS.includes(candidate) || existing.some((c) => c.id === candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}

export async function addCategory(data: { label: string; description: string }): Promise<DoorCategoryInfo> {
  const current = getCategoriesSnapshot();
  const id = uniqueId(slugify(data.label), current);
  const record: DoorCategoryInfo = { id, label: data.label, description: data.description };
  const { error } = await supabase
    .from("categories")
    .insert({ id, label: data.label, description: data.description, sort_order: current.length + 1 });
  if (error) throw error;
  await fetchCategories();
  return record;
}

/** تعديل الاسم والوصف فقط - المعرّف (رابط الصفحة) لا يتغيّر بعد الإنشاء حتى لا تنكسر الروابط المفهرسة. */
export async function updateCategory(id: string, data: { label: string; description: string }): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update({ label: data.label, description: data.description })
    .eq("id", id);
  if (error) throw error;
  await fetchCategories();
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  await fetchCategories();
}

export function getCategoryById(categories: DoorCategoryInfo[], id: string): DoorCategoryInfo | undefined {
  return categories.find((c) => c.id === id);
}
