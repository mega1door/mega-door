import { Children, cloneElement, isValidElement, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode, Ref } from "react";
import { GALLERY_DIR, attachSwipeAssist, nearestChildLeft } from "../lib/gallery";

/**
 * حاوية سحب أفقي موحّدة لكل السلايدرات بالموقع (أنواع الأبواب، الأكثر طلباً، شريط المصغّرات).
 *
 * - الاتجاه من مصدر واحد (lib/gallery.ts): المحتوى يتبع الإصبع دائماً، والعناصر مرتّبة بنفس
 *   اتجاه السحب. عناصر الحاوية تأخذ dir="rtl" تلقائياً حتى يبقى النص العربي سليماً.
 * - اللمس: تمرير المتصفح الأصلي مع scroll-snap (على thread الـ compositor = ناعم وخفيف)،
 *   وعنصر واحد بكل سحبة (snap-stop). التمرير العمودي للصفحة طبيعي.
 * - الماوس: سحب يدوي ثم تثبيت على أقرب عنصر. بدون تكرار دائري ولا أسهم ولا حركة تلقائية.
 * - data-swipe-gallery: يخبر حركة "الرجوع بالسحب" العامة أن تتجاهل هذه الحاوية بالكامل
 *   (بدل الاعتماد على كشف التمرير، اللي كان يفشل لما العناصر كلها تكفي الشاشة).
 */
export default function DragScroller({
  children,
  className = "",
  snap = true,
  scrollerRef,
}: {
  children: ReactNode;
  className?: string;
  snap?: boolean;
  scrollerRef?: Ref<HTMLDivElement>;
}) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);

  function setRefs(node: HTMLDivElement | null) {
    localRef.current = node;
    if (typeof scrollerRef === "function") scrollerRef(node);
    else if (scrollerRef) (scrollerRef as { current: HTMLDivElement | null }).current = node;
  }

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    // بعد سحب بالماوس نمنع النقر على الرابط/الزر اللي انسحبنا من فوقه
    function onClickCapture(e: MouseEvent) {
      if (dragRef.current?.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    // يمنع سحب الصورة/الرابط الأصلي من المتصفح
    function onDragStart(e: DragEvent) {
      e.preventDefault();
    }
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    const detachAssist = snap ? attachSwipeAssist(el) : undefined;
    return () => {
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      detachAssist?.();
    };
  }, [snap]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return; // اللمس يتكفّل به المتصفح
    dragRef.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const el = e.currentTarget;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 5) return;
      d.moved = true;
      el.style.scrollSnapType = "none"; // أثناء السحب اليدوي نوقف الـ snap حتى ما يقاوم
      el.style.cursor = "grabbing";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* غير مدعوم: السحب يشتغل بدونه */
      }
    }
    el.scrollLeft = d.left - dx; // المحتوى يتبع المؤشر بكلا الاتجاهين
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const el = e.currentTarget;
    if (!d.moved) {
      dragRef.current = null;
      return;
    }
    el.style.cursor = "";
    if (snap) el.scrollTo({ left: nearestChildLeft(el), behavior: "smooth" });
    // نرجّع الـ snap بعد انتهاء الانتقال الناعم، ونفك حجب النقر بعد انتهاء حدث click الحالي
    window.setTimeout(() => {
      el.style.scrollSnapType = "";
    }, 450);
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  }

  const items = Children.map(children, (c) =>
    isValidElement(c) ? cloneElement(c as ReactElement<{ dir?: string }>, { dir: "rtl" }) : c
  );

  return (
    <div
      ref={setRefs}
      dir={GALLERY_DIR}
      data-swipe-gallery
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`scrollbar-hide flex cursor-grab select-none overflow-x-auto overscroll-x-contain ${
        snap ? "snap-x snap-mandatory" : ""
      } ${className}`.trim()}
    >
      {items}
    </div>
  );
}
