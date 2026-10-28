import type { DoorModel } from "../types/model";



/**
 * موديلات حقيقية من صور تصوير فعلي لأبواب ميكا (مصدرها مجلد أرشيف الصور E:\ميكا،
 * بعد قصّ لوحة الشعار/التواصل الجانبية والإبقاء على الصورة الفوتوغرافية فقط).
 *
 * ⚠️ الحقول غير المؤكدة (الخامة، المقاس الدقيق، المواصفات، الاستخدام، "الأكثر طلباً")
 * غير موجودة عمداً - لم تُخمَّن، وتُترك فارغة بانتظار المعلومات الحقيقية من فريق ميكا
 * (تُراجع وتُضاف موديلاً موديلاً). الحقول الموجودة فقط هي المؤكدة فعلياً: الاسم،
 * القسم، الصورة الحقيقية، ولون accent المُستخرج آلياً من بكسلات الصورة نفسها (وليس
 * وصفاً تسويقياً للون - يُستخدم داخلياً فقط لتأثيرات الواجهة).
 */
/**
 * قائمة الموديلات التجريبية الأولية - تم تفريغها لتعتمد المنصة كلياً
 * على الموديلات الحقيقية المحفوظة في Supabase.
 */
export const demoModels: DoorModel[] = [];

/**
 * دوال مساعدة عامة (pure) تعمل على أي لائحة موديلات تُمرَّر لها - تُستخدم إما مع
 * `demoModels` مباشرة، أو (بمعظم صفحات الموقع) مع النسخة الحيّة القادمة من
 * `useModels()` في `src/lib/modelsStore.ts` بحيث تنعكس تعديلات لوحة الإدارة فوراً.
 */
export function getModelById(models: DoorModel[], id: string): DoorModel | undefined {
  return models.find((m) => m.id === id);
}

export function getModelsByCategory(models: DoorModel[], category: DoorModel["category"]): DoorModel[] {
  return models.filter((m) => m.category === category);
}

export function getPopularModels(models: DoorModel[]): DoorModel[] {
  return models.filter((m) => m.isPopular);
}

export { searchModels } from "../lib/search";
