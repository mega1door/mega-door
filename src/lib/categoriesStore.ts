import { useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";

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
 * قيمة seedCategories أدناه تُستخدم فقط كحالة أولية تظهر لحظياً قبل اكتمال
 * أول طلب فعلي من قاعدة البيانات (تفادي شاشة فارغة أثناء التحميل)، وكحالة
 * احتياطية إذا تعذّر الاتصال بقاعدة البيانات لأي سبب.
 */
const seedCategories: DoorCategoryInfo[] = [
  {
    id: "interior",
    label: "الأبواب الداخلية والصحيات",
    description:
      "تشكيلة أبواب داخلية وصحيات بخامات خشبية وزجاجية متعددة تناسب غرف النوم والمكاتب والصالات.",
  },
  {
    id: "exterior",
    label: "الأبواب الخارجية",
    description:
      "أبواب خارجية حديدية عالية الأمان بتصاميم كلاسيكية وعصرية تناسب المداخل الرئيسية والفلل.",
  },
  {
    id: "partitions",
    label: "القواطع الداخلية",
    description: "قواطع داخلية بتصاميم خشبية وزجاجية عصرية لفصل المساحات المفتوحة دون إغلاقها بالكامل.",
  },
];

type Listener = () => void;
let listeners: Listener[] = [];
let cache: DoorCategoryInfo[] = seedCategories;

function emitChange() {
  listeners.forEach((listener) => listener());
}

async function fetchCategories(): Promise<void> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,label,description")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("تعذّرت قراءة الأقسام من قاعدة البيانات.", error);
    return;
  }
  cache = data ?? [];
  emitChange();
}
void fetchCategories();

export function getCategoriesSnapshot(): DoorCategoryInfo[] {
  return cache;
}

export function subscribeCategories(listener: Listener): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useCategories(): DoorCategoryInfo[] {
  return useSyncExternalStore(subscribeCategories, getCategoriesSnapshot, () => seedCategories);
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
const RESERVED_SLUGS = ["admin", "popular", "search", "model", "design-your-door", "faq"];

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
