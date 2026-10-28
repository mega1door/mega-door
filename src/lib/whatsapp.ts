import type { DoorModel } from "../types/model";

/** رقم واتساب الشركة بصيغة دولية (بدون + وبدون أصفار بادئة).
 * ⚠️ مؤقتاً مبدّل لرقم اختبار (+9647866300946) بطلب صريح من العميلة لتجربة
 * طلبات "صمم تفاصيل باب مخصصة بالكامل" - يُطبَّق على كل روابط واتساب بالموقع
 * (الزر العائم، الفوتر، صفحات الأقسام الفارغة، الاستفسار عن موديل، وهذا النموذج).
 * الرقم الأصلي: 9647751420001 - أعيديه بمجرد ما تخلصين التجربة. */
export const WHATSAPP_NUMBER = "9647866300946";

/**
 * يبني رابط واتساب مع رسالة جاهزة تحتوي اسم ورقم الموديل بس (بدون رابط صفحة
 * الموديل - شيل بطلب صريح). صفحة الموديل نفسها (dist/model/<id>/index.html،
 * انظر scripts/generate-model-share-pages.mjs) لسا موجودة وتُبنى كالمعتاد
 * لأغراض SEO ومشاركة الروابط الأخرى، بس ما تُضمَّن تلقائياً برسالة الاستفسار.
 */
export function buildModelInquiryLink(model: DoorModel): string {
  const message = `مرحباً، أريد الاستفسار عن موديل: ${model.name} (كود الموديل: ${model.modelNumber})`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** رقم واتساب قسم المبيعات (07751420001) - يُستخدم لخيار «قسم المبيعات» بقائمة
 * الهمبرغر والفوتر حتى يفتح محادثة نفس الرقم المكتوب، بغض النظر عن رقم الاختبار أعلاه. */
export const SALES_WHATSAPP_NUMBER = "9647751420001";

export function buildSalesWhatsAppLink(): string {
  const message = "مرحباً، أريد الاستفسار عن أبواب ميكا.";
  return `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** رابط واتساب عام (بدون رسالة عن موديل محدد) - يُستخدم في الهيدر/الفوتر وزر التواصل العائم */
export function buildGeneralWhatsAppLink(): string {
  const message = "مرحباً، أريد الاستفسار عن أبواب ميكا.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * يبني رابط واتساب من بيانات نموذج "صمم تفاصيل باب مخصصة بالكامل": القياس
 * والملاحظات ورابط صورة التصميم (مرفوعة فعلياً لـ Supabase Storage قبل بناء
 * هذا الرابط - انظر imageUpload.ts) - واتساب يعرض معاينة الصورة تلقائياً
 * لما يكون رابطها بنص الرسالة.
 */
export function buildCustomDesignInquiryLink(params: {
  width: string;
  height: string;
  note: string;
  photoUrl: string | null;
  modelName?: string;
  modelNumber?: string;
}): string {
  const lines = ["مرحباً، أريد طلب تصميم باب مخصص:"];
  if (params.modelName) {
    lines.push(`الموديل الأساس: ${params.modelName}${params.modelNumber ? ` (${params.modelNumber})` : ""}`);
  }
  if (params.width && params.height) {
    lines.push(`القياس المطلوب: ${params.width}×${params.height} سم`);
  } else if (params.width || params.height) {
    lines.push(`القياس المطلوب: ${params.width || "؟"}×${params.height || "؟"} سم`);
  }
  if (params.note.trim()) {
    lines.push(`ملاحظات: ${params.note.trim()}`);
  }
  if (params.photoUrl) {
    lines.push(`صورة التصميم: ${params.photoUrl}`);
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
