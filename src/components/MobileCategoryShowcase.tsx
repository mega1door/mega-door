import { Link } from "react-router-dom";
import { useCategories } from "../lib/categoriesStore";
import { useModels } from "../lib/modelsStore";
import { getThumbnailUrl } from "../lib/imageUrl";
import DragScroller from "./DragScroller";

const BASE = import.meta.env.BASE_URL;

// صور تمثيلية حقيقية لكل قسم (لا رسومات توضيحية) - تُستخدم صور الموديلات الحقيقية
// المتاحة لكل قسم، مع صور العلامة الثابتة كبديل مضمون.
const fallbackImages: Record<string, string> = {
  interior: `${BASE}images/brand/hero-door.jpg`,
  exterior: `${BASE}images/brand/exterior-category.jpg`,
  partitions: `${BASE}images/brand/hero-door.jpg`,
};

/**
 * صف بطاقات كبيرة قابلة للسحب أفقياً - بديل روابط الأقسام غير الظاهرة بالهيدر
 * (Header.tsx يعرض همبرغر فقط بكل القياسات، بدون روابط نصية بالهيدر نفسه)،
 * لذلك يظهر هذا الصف بكل القياسات وليس بالفون فقط.
 */
export default function MobileCategoryShowcase() {
  const categories = useCategories();
  const models = useModels();

  const getCategoryImage = (categoryId: string) => {
    const categoryModel = models.find((m) => m.category === categoryId && m.images && m.images.length > 0);
    if (categoryModel && categoryModel.images[0]) {
      return getThumbnailUrl(categoryModel.images[0]);
    }
    return fallbackImages[categoryId] ?? fallbackImages.partitions;
  };

  return (
    <section>
      <DragScroller className="gap-4 px-4 pb-1 sm:px-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/${c.id}`}
            className="door-glow relative block aspect-[4/5] w-[78%] shrink-0 snap-center snap-always overflow-hidden rounded-[20px] border border-silver/25 bg-surface sm:w-[300px]"
          >
            <img
              src={getCategoryImage(c.id)}
              alt={c.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = fallbackImages[c.id] ?? fallbackImages.partitions;
              }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-5 py-5">
              <p className="font-display text-lg font-extrabold text-white">{c.label}</p>
            </div>
          </Link>
        ))}
      </DragScroller>
    </section>
  );
}
