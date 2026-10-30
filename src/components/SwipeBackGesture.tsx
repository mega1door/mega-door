import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SWIPE_MIN_DISTANCE = 90;
// السحب العمودي يجب أن يبقى صغيراً نسبياً حتى نعتبره سحباً أفقياً مقصوداً
// (وليس تمرير عمودي عادي للصفحة تحرّك فيه المؤشر بزاوية بسيطة).
const MAX_VERTICAL_RATIO = 0.5;

/** يبحث بالعناصر الأب عن أول حاوية قابلة للتمرير أفقياً (كاروسيل بالسحب) حتى لا
 * نتعارض مع سحبها (مثل صف بطاقات الأقسام أو سلايدر الأكثر طلباً بالهاتف). */
function isInsideHorizontalScroller(el: HTMLElement | null): boolean {
  let node = el;
  let depth = 0;
  while (node && depth < 8) {
    if (node.scrollWidth > node.clientWidth + 2) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
    depth++;
  }
  return false;
}

/**
 * سحب من أي مكان بالشاشة من اليمين لليسار يرجع للصفحة السابقة - بالإصبع
 * بالهاتف، وبالماوس بالحاسبة (Pointer Events توحّد الاثنين بحدث واحد بدل
 * touchstart/end اللي ما تشتغل إطلاقاً مع الماوس). يتجاهل السحب الذي يبدأ
 * داخل حاوية قابلة للتمرير أفقياً أو داخل حقل إدخال نص، حتى لا يتعارض مع
 * سحبها الخاص أو مع تحديد النص بالماوس.
 */
export default function SwipeBackGesture() {
  const navigate = useNavigate();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let pointerId: number | null = null;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      // كل السلايدرات ومعارض الصور (وكاروسيل الهيرو) معلّمة data-swipe-gallery وعندها سحب خاص
      // باللمس والماوس: ما نرجع للخلف من فوقها أبداً (حتى لو عناصرها كلها تكفي الشاشة).
      const inTouchGallery = target.closest("[data-swipe-gallery]");
      if (target.closest("input, textarea, select") || inTouchGallery || isInsideHorizontalScroller(target)) {
        tracking = false;
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      pointerId = e.pointerId;
    }

    function onPointerUp(e: PointerEvent) {
      if (!tracking || e.pointerId !== pointerId) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx > -SWIPE_MIN_DISTANCE) return;
      if (Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return;
      navigate(-1);
    }

    function onPointerCancel(e: PointerEvent) {
      if (e.pointerId === pointerId) tracking = false;
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [navigate]);

  return null;
}
