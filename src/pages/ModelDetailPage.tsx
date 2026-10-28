import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getModelById } from "../data/models";
import { useModels } from "../lib/modelsStore";
import { useCategories, getCategoryById } from "../lib/categoriesStore";
import { buildModelInquiryLink } from "../lib/whatsapp";
import { setPageSEO } from "../lib/seo";
import { modelMetadata } from "../lib/catalogMetadata";
import { trackContact, trackViewContent } from "../lib/metaPixel";
import DragScroller from "../components/DragScroller";
import SwipeCarousel from "../components/SwipeCarousel";
import BottomBackBar from "../components/BottomBackBar";
import { getThumbnailUrl, handleThumbError } from "../lib/imageUrl";

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const models = useModels();
  const model = id ? getModelById(models, id) : undefined;
  const categories = useCategories();
  const categoryLabel = model ? getCategoryById(categories, model.category)?.label ?? model.category : "";
  const [activeImage, setActiveImage] = useState(0);

  // الصورة الكبيرة: SwipeCarousel (نظام الكاروسيل الموحّد). سحب لليسار = التالية، لليمين = السابقة.
  const thumbsRef = useRef<HTMLDivElement>(null);

  // الصورة المصغّرة النشطة تبقى ظاهرة بالشريط (تمرير أفقي فقط، ما يحرك الصفحة)
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[activeImage] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const s = strip.getBoundingClientRect();
    const t = thumb.getBoundingClientRect();
    strip.scrollBy({ left: t.left + t.width / 2 - (s.left + s.width / 2), behavior: "smooth" });
  }, [activeImage]);

  useEffect(() => {
    if (!model) {
      setPageSEO({ title: "الموديل غير موجود | ميكا للأبواب", description: "الموديل المطلوب غير متوفر.", path: `/model/${encodeURIComponent(id || "")}/`, noindex: true });
      return;
    }
    const metadata = modelMetadata(model, categoryLabel);
    setPageSEO(metadata);
    trackViewContent({ modelNumber: model.modelNumber, modelName: model.name, category: model.category });
    setActiveImage(0);

    // Schema.org Product لهذا الموديل تحديداً
    const scriptId = "model-product-schema";
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    script.textContent = JSON.stringify(metadata.product);
    document.head.appendChild(script);
    return () => script.remove();
  }, [model, categoryLabel, id]);

  if (!model) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-ink">لم يتم العثور على هذا الموديل</h1>
        <Link to="/" className="mt-4 inline-block text-brand underline">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:py-20">
      <BottomBackBar fallbackTo={`/${model.category}`} />
      <nav className="mb-6 text-xs text-muted">
        <Link to="/" className="hover:text-brand">
          الرئيسية
        </Link>
        {" / "}
        <Link to={`/${model.category}`} className="hover:text-brand">
          {categoryLabel}
        </Link>
        {" / "}
        <span className="text-ink">{model.name}</span>
      </nav>

      {/* grid-cols-1 = minmax(0,1fr): بدونه العمود بالموبايل ياخذ عرض الصورة الأصلي
          (1024px) والصفحة كلها تطلع أعرض من الشاشة وتنقص الصورة. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* معرض الصور */}
        <div>
          <SwipeCarousel
            images={model.images}
            index={activeImage}
            onIndexChange={setActiveImage}
            resetKey={model.id}
            getAlt={(i) => `${modelMetadata(model, categoryLabel).alt} — صورة ${i + 1}`}
            className="aspect-[3/4] rounded-2xl border border-border bg-canvas shadow-[0_0_26px_2px_rgba(20,137,255,0.2)]"
          />
          {model.images.length > 1 && (
            <DragScroller scrollerRef={thumbsRef} snap={false} className="mt-3 gap-3 pb-1">
              {model.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImage ? "border-brand" : "border-border opacity-70"
                  }`}
                  aria-label={`عرض الصورة ${i + 1}`}
                >
                  <img
                    src={getThumbnailUrl(src)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleThumbError(e, src)}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </DragScroller>
          )}
        </div>

        {/* التفاصيل */}
        <div>
          {model.isPopular && (
            <span className="mb-3 inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
              الأكثر طلباً
            </span>
          )}
          <p className="text-sm font-medium text-muted">{model.modelNumber}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">{model.name}</h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
            <div>
              <dt className="text-muted">القسم</dt>
              <dd className="mt-1 font-medium text-ink">{categoryLabel}</dd>
            </div>
            {model.material && (
              <div>
                <dt className="text-muted">النوع</dt>
                <dd className="mt-1 font-medium text-ink">{model.material}</dd>
              </div>
            )}
            {model.color && (
              <div>
                <dt className="text-muted">اللون</dt>
                <dd className="mt-1 font-medium text-ink">{model.color}</dd>
              </div>
            )}
            {model.dimensions && (
              <div>
                <dt className="text-muted">القياسات</dt>
                <dd className="mt-1 font-medium text-ink">{model.dimensions}</dd>
              </div>
            )}
          </dl>

          {model.specs && model.specs.length > 0 && (
            <div className="mt-5">
              <h2 className="text-sm font-bold text-ink">المواصفات</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
                {model.specs.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {model.usage && (
            <div className="mt-5">
              <h2 className="text-sm font-bold text-ink">أين يمكن استخدامه</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{model.usage}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={buildModelInquiryLink(model)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContact("model_detail_button")}
              className="flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-4 text-base font-bold text-white transition hover:brightness-105"
            >
              استفسر عن هذا الموديل عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
