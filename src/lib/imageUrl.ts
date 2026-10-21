/**
 * دوال مساعدة موحدة للتعامل مع روابط صور الموديلات ومقاساتها في الموقع.
 */

/**
 * يعيد رابط النسخة المصغّرة (Thumbnail) المخصصة للبطاقات وشريط المعرض.
 * - إذا كانت الصورة WebP مرفوعة بالنظام الحديث (.../uuid.webp)، يُستبدل الامتداد بـ -thumb.webp.
 * - إذا كانت الصورة هي أصلاً نسخة مصغّرة (...-thumb.webp)، تُعاد كما هي.
 * - إذا كانت صورة قديمة (.jpg أو .png أو مسار محلي)، تُعاد كما هي دون أي تغيير لضمان التوافق التام وعدم كسر الصور السابقة.
 */
export function getThumbnailUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.includes("-thumb.webp")) return url;
  if (url.endsWith(".webp")) {
    return url.replace(/\.webp$/, "-thumb.webp");
  }
  if (url.includes(".webp?")) {
    return url.replace(/\.webp\?/, "-thumb.webp?");
  }
  return url;
}

/**
 * يعيد رابط الصورة بالعرض الكامل (Full display).
 */
export function getFullImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.includes("-thumb.webp")) {
    return url.replace("-thumb.webp", ".webp");
  }
  return url;
}

/**
 * معالج أمان لحدث onError للصور:
 * إذا تعذّر تحميل النسخة المصغّرة لأي سبب شبكي أو لعدم توفرها،
 * يرجع تلقائياً للنسخة الكاملة دون إظهار أي صورة مكسورة.
 */
export function handleThumbError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallbackUrl?: string
) {
  const target = e.currentTarget;
  if (target.src.includes("-thumb.webp")) {
    target.src = fallbackUrl ? getFullImageUrl(fallbackUrl) : target.src.replace("-thumb.webp", ".webp");
  }
}
