/**
 * اتجاه كل السلايدرات ومعارض الصور بالموقع (مصدر واحد):
 * - "rtl" (المعتمد - الموقع عربي): العنصر الأول على اليمين، والتالي نحو اليسار.
 *          المحتوى يتبع الإصبع دائماً، فسحب لليمين = التالي، لليسار = السابق.
 * - "ltr": العكس (الأول يسار، سحب لليسار = التالي).
 * نص البطاقات نفسه يبقى عربياً RTL بكل الأحوال (DragScroller يضع dir="rtl" على عناصره).
 * ملاحظة: الاتجاه الفيزيائي للسحب مرتبط بترتيب العناصر؛ لا يمكن الجمع بين "أول عنصر
 * يمين" و"سحب لليسار = التالي" بدون عكس حركة المحتوى عن الإصبع.
 */
export const GALLERY_DIR: "ltr" | "rtl" = "rtl";

/** حدود scrollLeft المسموحة (RTL: من -max إلى 0، LTR: من 0 إلى max). */
export function scrollBounds(el: HTMLElement): { min: number; max: number } {
  const span = Math.max(0, el.scrollWidth - el.clientWidth);
  return GALLERY_DIR === "rtl" ? { min: -span, max: 0 } : { min: 0, max: span };
}

/** scrollLeft الذي يجعل `child` بمنتصف الحاوية (مقصوص بحدودها - أول/آخر عنصر هما الحد). */
export function centerLeftFor(el: HTMLElement, child: HTMLElement): number {
  const er = el.getBoundingClientRect();
  const cr = child.getBoundingClientRect();
  const raw = el.scrollLeft + (cr.left + cr.width / 2 - (er.left + er.width / 2));
  const { min, max } = scrollBounds(el);
  return Math.min(max, Math.max(min, raw));
}

/** أقرب عنصر (من أبناء الحاوية) لموضع التمرير الحالي. */
export function nearestChildLeft(el: HTMLElement): number {
  let best = el.scrollLeft;
  let bestDist = Infinity;
  Array.from(el.children).forEach((c) => {
    const left = centerLeftFor(el, c as HTMLElement);
    const d = Math.abs(left - el.scrollLeft);
    if (d < bestDist) {
      bestDist = d;
      best = left;
    }
  });
  return best;
}

/**
 * مساعد السحب القصير للّمس: scroll-snap الأصلي يرجّع للعنصر نفسه إذا السحبة أقل من نصف
 * العرض وبطيئة، فتبين المعارض "ما تستجيب" لسحبة قصيرة. هنا إذا تحرّك المحتوى
 * `minDistance` بكسل أو أكثر باتجاه معيّن ولسا نفس العنصر هو الأقرب (يعني راح يرجع)
 * ننقله للعنصر المجاور بنفس الاتجاه (حركة ناعمة). السحبة الطويلة/السريعة يتولاها المتصفح.
 * الحدود (أول/آخر عنصر) محفوظة: لا يتجاوز الأطراف ولا يدور.
 */
export function attachSwipeAssist(el: HTMLElement, minDistance = 24): () => void {
  let startLeft = 0;
  let startChild = -1;
  let lefts: number[] = [];

  const nearestIndex = (pos: number) => {
    let best = 0;
    let bestDist = Infinity;
    lefts.forEach((l, i) => {
      const d = Math.abs(l - pos);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  function onTouchStart() {
    lefts = Array.from(el.children).map((c) => centerLeftFor(el, c as HTMLElement));
    startLeft = el.scrollLeft;
    startChild = lefts.length ? nearestIndex(startLeft) : -1;
  }

  function onTouchEnd() {
    if (startChild < 0) return;
    const delta = el.scrollLeft - startLeft;
    if (Math.abs(delta) < minDistance) return;
    if (nearestIndex(el.scrollLeft) !== startChild) return; // المتصفح راح ينقل بنفسه
    const step = (delta > 0 ? 1 : -1) * (GALLERY_DIR === "rtl" ? -1 : 1);
    const target = startChild + step;
    if (target < 0 || target >= lefts.length) return; // حدود أول/آخر عنصر
    el.scrollTo({ left: lefts[target], behavior: "smooth" });
  }

  el.addEventListener("touchstart", onTouchStart, { passive: true });
  el.addEventListener("touchend", onTouchEnd, { passive: true });
  return () => {
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchend", onTouchEnd);
  };
}
