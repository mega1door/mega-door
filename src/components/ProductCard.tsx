import { Link } from "react-router-dom";
import type { DoorModel } from "../types/model";
import { modelMetadata } from "../lib/catalogMetadata";
import { useCategories } from "../lib/categoriesStore";
import { getThumbnailUrl, handleThumbError } from "../lib/imageUrl";

/**
 * بطاقة الموديل - مستخدمة بالرئيسية والأكثر طلباً والبحث وصفحات الأقسام.
 *
 * - أقل من lg (الموبايل والتابلت): شكل التصميم المعتمد - سطح فحمي، صورة الباب
 *   كاملة بدون قص (object-contain)، «الكود - الاسم»، المواصفات المؤكدة فقط، وزر
 *   «عرض التفاصيل» البرونزي يفتح صفحة الموديل المستقلة.
 * - lg فأكبر (الديسكتوب): نفس الشكل الحالي بدون تغيير (بانتظار اعتماد تصميم الديسكتوب).
 *
 * السعر غير معروض: لا يوجد حالياً خيار تفعيل لعرضه من لوحة الإدارة.
 */
export default function ProductCard({ model }: { model: DoorModel }) {
  const categories = useCategories();
  const metadata = modelMetadata(model, categories.find(c => c.id === model.category)?.label);
  const displayName = metadata.name;
  const subtitle = [model.material, model.color, model.dimensions].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/model/${encodeURIComponent(model.id)}/`}
      className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-white/[0.06] bg-charcoal-card p-1.5 transition active:scale-[0.99] lg:door-glow lg:block lg:rounded-2xl lg:border-silver/25 lg:bg-surface lg:p-0 lg:hover:-translate-y-1 lg:hover:shadow-lg lg:hover:shadow-black/5"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-charcoal-deep lg:aspect-[3/4] lg:rounded-none lg:bg-canvas">
        <img
          src={getThumbnailUrl(model.images[0])}
          alt={metadata.alt}
          loading="lazy"
          decoding="async"
          onError={(e) => handleThumbError(e, model.images[0])}
          className="h-full w-full object-contain transition duration-300 lg:group-hover:scale-105"
        />
        {model.isPopular && (
          <span className="absolute right-2 top-2 rounded-full bg-bronze px-2.5 py-0.5 text-[11px] font-bold text-charcoal lg:right-3 lg:top-3 lg:bg-brand lg:px-3 lg:py-1 lg:text-xs lg:text-white">
            الأكثر طلباً
          </span>
        )}
      </div>

      {/* الموبايل */}
      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-2.5 lg:hidden">
        <h3 className="font-body text-[14px] font-bold leading-5 text-ink">
          <span dir="ltr" className="[unicode-bidi:isolate]">
            {model.modelNumber}
          </span>{" "}
          - {displayName}
        </h3>
        {subtitle && <p className="mt-1 line-clamp-2 text-[12px] leading-[1.6] text-muted">{subtitle}</p>}
        <span aria-hidden="true" className="block min-h-3 flex-1" />
        <span className="flex h-10 items-center justify-center gap-1 rounded-lg border border-bronze/75 pt-px text-[13px] font-bold text-bronze-light transition-colors group-active:bg-bronze/10">
          عرض التفاصيل
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 6l-6 6 6 6" />
          </svg>
        </span>
      </div>

      {/* الديسكتوب - بدون تغيير */}
      <div className="hidden p-5 lg:block">
        <p className="text-xs font-medium text-muted">{model.modelNumber}</p>
        <h3 className="mt-1 font-display text-base font-bold text-ink">{displayName}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </Link>
  );
}
