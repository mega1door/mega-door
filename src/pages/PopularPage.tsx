import { useEffect } from "react";
import { getPopularModels } from "../data/models";
import { useModels } from "../lib/modelsStore";
import CategorySection from "../components/CategorySection";
import { setPageSEO } from "../lib/seo";
import { buildGeneralWhatsAppLink } from "../lib/whatsapp";
import { trackContact } from "../lib/metaPixel";

export default function PopularPage() {
  useEffect(() => {
    setPageSEO({
      title: "الأكثر طلباً | ميكا للأبواب",
      description: "أبرز موديلات الأبواب الداخلية والخارجية الأكثر طلباً لدى زبائن ميكا في بغداد.",
      path: "/popular",
    });
  }, []);

  const allModels = useModels();
  const models = getPopularModels(allModels);

  return (
    <div>
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-extrabold text-ink">الأكثر طلباً</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            الموديلات التي يختارها أغلب زبائننا، من الأبواب الداخلية والخارجية.
          </p>
        </div>
      </div>
      {models.length > 0 ? (
        <CategorySection title={`${models.length} موديل`} models={models} />
      ) : (
        <div className="mx-auto max-w-[480px] px-4 py-20 text-center sm:px-6">
          <p className="font-display text-xl font-extrabold text-ink">قائمة الأكثر طلباً تُحدَّث قريباً</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            تواصل معنا مباشرة عبر واتساب للاطلاع على الموديلات والتصاميم المتاحة حالياً فوراً.
          </p>
          <a
            href={buildGeneralWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContact("empty_popular")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-sm font-bold text-white transition hover:brightness-105"
          >
            تواصل معنا عبر واتساب
          </a>
        </div>
      )}
    </div>
  );
}
