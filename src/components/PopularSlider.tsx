import ProductCard from "./ProductCard";
import DragScroller from "./DragScroller";
import type { DoorModel } from "../types/model";

/**
 * سلايدر "الأكثر طلباً هذا الشهر" بالصفحة الرئيسية - نفس بطاقة الموديل (ProductCard).
 * سحب يدوي يمين ويسار بالموبايل والديسكتوب، بدون أي حركة تلقائية.
 * بالديسكتوب عرض البطاقة = عرض عمود الشبكة القديمة (4 أعمدة) فيبقى نفس الحجم.
 */
export default function PopularSlider({ models }: { models: DoorModel[] }) {
  return (
    <DragScroller className="gap-5 px-1 pb-1 lg:gap-6 lg:px-0">
      {models.map((m) => (
        <div
          key={m.id}
          className="w-[86%] shrink-0 snap-center snap-always sm:w-[60%] lg:w-[calc((100%_-_72px)/4)] lg:snap-start"
        >
          <ProductCard model={m} />
        </div>
      ))}
    </DragScroller>
  );
}
