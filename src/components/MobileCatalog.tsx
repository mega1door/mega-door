import { useState } from "react";
import { buildGeneralWhatsAppLink } from "../lib/whatsapp";
import { trackContact } from "../lib/metaPixel";
import { useCategories } from "../lib/categoriesStore";
import { useModels } from "../lib/modelsStore";
import { getModelsByCategory } from "../data/models";
import ProductCard from "./ProductCard";

/**
 * قسم الموبايل تحت الهيرو حسب التصميم المعتمد:
 * - أزرار أقسام أفقية قابلة للسحب - الأسماء والترتيب من Supabase (جدول categories)
 *   مباشرة، بدون أي اسم مكتوب ثابت بالكود.
 * - شبكة بعمودين لموديلات القسم المختار (من Supabase أيضاً)، كل بطاقة تفتح
 *   صفحة الموديل المستقلة.
 */
export default function MobileCatalog() {
  const categories = useCategories();
  const models = useModels();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // القسم المختار افتراضياً = أول قسم بترتيب لوحة الإدارة
  const activeId =
    selectedId && categories.some((c) => c.id === selectedId) ? selectedId : categories[0]?.id ?? null;
  const active = categories.find((c) => c.id === activeId);
  const list = activeId ? getModelsByCategory(models, activeId) : [];

  if (categories.length === 0) return null;

  return (
    <section aria-label="أقسام الأبواب والموديلات" className="pb-6">
      <div
        role="tablist"
        aria-label="أقسام الأبواب"
        className="scrollbar-hide flex gap-2.5 overflow-x-auto overscroll-x-contain px-4 py-4"
      >
        {categories.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="mobile-models-grid"
              onClick={() => setSelectedId(c.id)}
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13.5px] font-bold transition-colors duration-200 ${
                isActive
                  ? "border-bronze bg-bronze text-charcoal"
                  : "border-bronze/60 bg-transparent text-ink/90 active:bg-bronze/10"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div id="mobile-models-grid" role="tabpanel" aria-label={active?.label} className="px-3">
        {list.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {list.map((m) => (
              <ProductCard key={m.id} model={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-white/[0.06] bg-charcoal-card px-5 py-9 text-center">
            <p className="text-[15px] font-bold text-ink">موديلات هذا القسم بالطريق</p>
            <p className="mx-auto mt-1.5 max-w-[32ch] text-[13px] leading-6 text-muted">
              تواصل معنا مباشرة عبر واتساب وفريقنا يساعدك يلگي الباب المناسب إلك بهذا القسم فوراً.
            </p>
            <a
              href={buildGeneralWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContact("empty_category")}
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-bronze/70 px-4 text-[13px] font-bold text-bronze-light"
            >
              تواصل معنا عبر واتساب
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
