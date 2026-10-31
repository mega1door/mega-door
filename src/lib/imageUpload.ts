import { supabase } from "./supabaseClient";
import { createOptimizedWebPPair, fileToWebPBlob } from "./imageResize";

// Customer room-photo preview is temporarily off. Keep the upload path intact
// for a future re-enable after its Supabase Storage policy has been reviewed.
export const CUSTOMER_DESIGN_UPLOADS_ENABLED = false;

/**
 * يرفع الصورة بعد تحويلها تلقائياً إلى صيغة WebP الحديثة والمحسّنة.
 *
 * عند رفع صور الموديلات ("models"):
 * - يتم توليد نسختين WebP محلياً في المتصفح:
 *   1. نسخة العرض الكامل (Full) حتى 1400px وجودة 85% لحفظ تفاصيل الخشب والنقوش ودرجة اللون.
 *   2. نسخة مصغّرة للبطاقات (Thumbnail) حتى 480px وجودة 80% لتحميل فائق السرعة وتوفير الباندويث.
 * - يتم تخزين النسختين المحسّنتين فقط في Supabase Storage دون رفع الصورة الأصلية غير المضغوطة نهائياً.
 * - يُعاد الرابط العام للنسخة الكاملة، وتُشتق النسخة المصغرة منه تلقائياً عبر getThumbnailUrl.
 *
 * عند رفع صور الموقع ("site") أو التصاميم المخصصة ("custom-designs"):
 * - يتم تحويلها إلى WebP عالي الجودة ومحسّن أيضاً.
 */
export async function uploadImage(
  file: File,
  folder: "models" | "site" | "custom-designs"
): Promise<string> {
  if (folder === "custom-designs" && !CUSTOMER_DESIGN_UPLOADS_ENABLED) {
    throw new Error("Customer design uploads are temporarily disabled.");
  }

  const id = crypto.randomUUID();

  if (folder === "models") {
    const { full, thumb } = await createOptimizedWebPPair(file);
    const fullPath = `models/${id}.webp`;
    const thumbPath = `models/${id}-thumb.webp`;

    const [fullUpload, thumbUpload] = await Promise.all([
      supabase.storage.from("site-images").upload(fullPath, full.blob, {
        contentType: "image/webp",
        cacheControl: "31536000, immutable",
        upsert: false,
      }),
      supabase.storage.from("site-images").upload(thumbPath, thumb.blob, {
        contentType: "image/webp",
        cacheControl: "31536000, immutable",
        upsert: false,
      }),
    ]);

    if (fullUpload.error) throw fullUpload.error;
    if (thumbUpload.error) throw thumbUpload.error;

    const { data } = supabase.storage.from("site-images").getPublicUrl(fullPath);
    return data.publicUrl;
  }

  // صور الهيرو أو التصاميم المخصصة
  const maxDim = folder === "site" ? 1600 : 1280;
  const quality = folder === "site" ? 0.88 : 0.82;
  const { blob } = await fileToWebPBlob(file, maxDim, quality);
  const path = `${folder}/${id}.webp`;

  const { error } = await supabase.storage.from("site-images").upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000, immutable",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return data.publicUrl;
}
