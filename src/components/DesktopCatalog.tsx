import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../lib/categoriesStore";
import { useModels } from "../lib/modelsStore";
import { buildGeneralWhatsAppLink } from "../lib/whatsapp";
import ProductCard from "./ProductCard";

/** Desktop uses the same category tabs and model cards as the approved mobile layout. */
export default function DesktopCatalog() {
  const categories = useCategories();
  const models = useModels();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId =
    selectedId && categories.some((category) => category.id === selectedId)
      ? selectedId
      : categories[0]?.id ?? null;
  const active = categories.find((category) => category.id === activeId);
  const items = activeId ? models.filter((model) => model.category === activeId) : [];

  if (!categories.length || !active) return null;

  return (
    <section className="desktop-catalog-proposal" aria-label="أقسام الأبواب والموديلات">
      <div className="desktop-category-tabs" role="tablist" aria-label="أقسام الأبواب">
        {categories.map((category) => {
          const selected = category.id === activeId;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="desktop-models-grid"
              onClick={() => setSelectedId(category.id)}
              className={`desktop-category-tab h-11 shrink-0 whitespace-nowrap rounded-full border px-5 text-[14px] font-bold transition-colors duration-200 ${
                selected
                  ? "border-bronze bg-bronze text-charcoal"
                  : "border-bronze/60 bg-transparent text-ink/90 hover:bg-bronze/10"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="desktop-category-heading">
        <h2>{active.label}</h2>
        <Link to={`/${active.id}`}>عرض الكل</Link>
      </div>

      <div id="desktop-models-grid" role="tabpanel" aria-label={active.label}>
        {items.length ? (
          <div className="desktop-model-grid">
            {items.map((model) => <ProductCard key={model.id} model={model} />)}
          </div>
        ) : (
          <div className="desktop-empty-category">
            <p>موديلات هذا القسم بالطريق</p>
            <a href={buildGeneralWhatsAppLink()} target="_blank" rel="noopener noreferrer">
              تواصل معنا عبر واتساب
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
