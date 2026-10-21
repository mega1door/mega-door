import { Link } from "react-router-dom";
import type { DoorModel } from "../types/model";
import { getThumbnailUrl, handleThumbError } from "../lib/imageUrl";

export default function ProductCard({ model }: { model: DoorModel }) {
  const subtitle = [model.material, model.color, model.dimensions].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/model/${model.id}`}
      className="door-glow group block overflow-hidden rounded-2xl border border-silver/25 bg-surface transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas">
        <img
          src={getThumbnailUrl(model.images[0])}
          alt={`باب ${model.name} - موديل ${model.modelNumber}`}
          loading="lazy"
          decoding="async"
          onError={(e) => handleThumbError(e, model.images[0])}
          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
        />
        {model.isPopular && (
          <span className="absolute top-3 right-3 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
            الأكثر طلباً
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-medium text-muted">{model.modelNumber}</p>
        <h3 className="mt-1 font-display text-base font-bold text-ink">{model.name}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </Link>
  );
}
