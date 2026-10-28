/**
 * site_settings.hero_images يحمل نوعين من الروابط:
 * - صور موديلات «وصل حديثاً» (روابط صور موجودة أصلاً بمجلد models/).
 * - صور الهيرو الاحتياطية (حتى 3) المرفوعة من تبويب الهيرو بمجلد site/.
 * الاحتياطية تظهر بس إذا ما اكو موديلات مختارة للهيرو.
 */
export const MAX_FALLBACK_HERO = 3;

export function isFallbackHeroUrl(url: string): boolean {
  return url.includes("/site-images/site/");
}

export function splitHeroImages(urls: string[] | null | undefined): { modelUrls: string[]; fallbackUrls: string[] } {
  const all = urls ?? [];
  return {
    modelUrls: all.filter((u) => !isFallbackHeroUrl(u)),
    fallbackUrls: all.filter(isFallbackHeroUrl).slice(0, MAX_FALLBACK_HERO),
  };
}
