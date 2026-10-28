/** الدومين الفعلي المنشور عليه الموقع حالياً (GitHub Pages) - كان مضبوطاً على
 * "megadoor.iq" وهو دومين غير مفعّل إطلاقاً (ما يرجّع أي استجابة)، وكان يكسر
 * كل معاينات الروابط (واتساب/فيسبوك) لأي صفحة بالموقع بدون استثناء. */
import { absoluteSiteUrl, canonicalPageUrl } from "./catalogMetadata";
const DEFAULT_OG_IMAGE = absoluteSiteUrl("/images/brand/mega-door-logo.png");

/** يحوّل مسار صورة نسبي (يبدأ بـ /) لرابط مطلق فوق دومين الموقع الفعلي.
 * رابط مطلق أصلاً (صور مرفوعة لـ Supabase Storage) يُترك كما هو. */
export function toAbsoluteUrl(path: string): string {
  return absoluteSiteUrl(path);
}

function setMetaTag(selector: string, attr: string, attrValue: string, content: string) {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * يحدّث عنوان الصفحة، meta description، og:title/description/image، ورابط canonical
 * بشكل ديناميكي بدون مكتبات إضافية. يُستدعى من كل صفحة عند تحميلها.
 *
 * `image` اختياري: مسار نسبي (يبدأ بـ /) أو رابط مطلق لصورة الصفحة نفسها (مثال: صورة
 * الموديل بصفحة تفاصيله) لتظهر بمعاينة الرابط عند مشاركته بواتساب/فيسبوك. إن لم يُمرَّر
 * تُستخدم صورة الشعار الافتراضية حتى لا تبقى صورة صفحة سابقة عالقة بعد تنقل SPA.
 */
export function setPageSEO(params: { title: string; description: string; path?: string; image?: string; alt?: string; noindex?: boolean }) {
  document.title = params.title;

  setMetaTag('meta[name="description"]', "name", "description", params.description);
  setMetaTag('meta[property="og:title"]', "property", "og:title", params.title);
  setMetaTag('meta[property="og:description"]', "property", "og:description", params.description);
  setMetaTag('meta[name="robots"]', "name", "robots", params.noindex ? "noindex, follow" : "index, follow");
  setMetaTag('meta[property="og:type"]', "property", "og:type", params.path?.startsWith("/model/") ? "product" : "website");

  const absoluteImage = params.image ? toAbsoluteUrl(params.image) : DEFAULT_OG_IMAGE;
  setMetaTag('meta[property="og:image"]', "property", "og:image", absoluteImage);
  setMetaTag('meta[property="og:image:alt"]', "property", "og:image:alt", params.alt || params.title);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", canonicalPageUrl(params.path));

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute("content", canonicalPageUrl(params.path));
}
