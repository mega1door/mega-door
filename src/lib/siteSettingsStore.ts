import { useSyncExternalStore } from "react";
import { supabase } from "./supabaseClient";

/**
 * إعدادات عامة للموقع تُدار من لوحة الإدارة (حالياً: صورة الهيرو فقط) - قاعدة
 * بيانات Supabase حقيقية (جدول public.site_settings، صف واحد ثابت). إذا ما
 * كانت هناك صورة مرفوعة بعد، يبقى الموقع يعرض الصورة الثابتة الافتراضية
 * (انظر HomePage.tsx) بدون أي كسر بالتصميم.
 */
export interface SiteSettings {
  heroImageUrl: string | null;
  heroImages: string[]; // URLs of the 8 hero images
  /** بريد التواصل الاختياري - يظهر بقائمة الهمبرغر فقط إذا موجود. ما له عمود
   * بقاعدة البيانات بعد (يحتاج موافقة لإضافة site_settings.contact_email)، فيبقى null. */
  contactEmail: string | null;
}

const initial: SiteSettings = { heroImageUrl: null, heroImages: [], contactEmail: null };

type Listener = () => void;
let listeners: Listener[] = [];
let cache: SiteSettings = initial;

function emitChange() {
  listeners.forEach((l) => l());
}

async function fetchSettings(): Promise<void> {
  const { data, error } = await supabase.from("site_settings").select("hero_image_url,hero_images").eq("id", true).single();
  if (error) {
    console.error("تعذّرت قراءة إعدادات الموقع من قاعدة البيانات.", error);
    return;
  }
  cache = { heroImageUrl: data?.hero_image_url ?? null, heroImages: data?.hero_images ?? [], contactEmail: null };
  emitChange();
}
void fetchSettings();

export function getSiteSettingsSnapshot(): SiteSettings {
  return cache;
}

export function subscribeSiteSettings(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useSiteSettings(): SiteSettings {
  return useSyncExternalStore(subscribeSiteSettings, getSiteSettingsSnapshot, () => initial);
}

export async function updateHeroImage(url: string): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .update({ hero_image_url: url, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
  await fetchSettings();
}

export async function updateHeroImages(urls: string[]): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .update({ hero_images: urls, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
  await fetchSettings();
}
