import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TRACK_TRANSITION = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * نظام كاروسيل موحّد للصور:
 * - يدعم السحب باللمس على كافة أجهزة الموبايل (يمين ويسار) بسلاسة كاملة 60fps.
 * - يمنع تعارض السحب الأفقي مع تمرير الصفحة العمودي (يحافظ على سلاسة التمرير).
 * - يدعم السحب بالماوس لأجهزة الكمبيوتر والأسهم بلوحة المفاتيح.
 * - يتزامن تلقائياً مع المصغرات السفلية في كلا الاتجاهين.
 */
export default function SwipeCarousel({
  images,
  index,
  onIndexChange,
  getAlt,
  resetKey,
  className = "",
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  getAlt: (i: number) => string;
  resetKey?: string;
  className?: string;
}) {
  const count = images.length;
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const indexRef = useRef(index);
  indexRef.current = index;
  const [visited, setVisited] = useState<{ key: string | undefined; urls: string[] }>({ key: resetKey, urls: [] });
  useEffect(() => {
    const current = images[index];
    setVisited(previous => {
      const urls = previous.key === resetKey ? previous.urls : [];
      if (previous.key === resetKey && (!current || urls.includes(current))) return previous;
      return { key: resetKey, urls: current ? [...urls, current] : urls };
    });
  }, [images, index, resetKey]);

  function prepareAdjacentImages() {
    if (count < 2) return;
    const adjacent = [images[index], images[(index + 1) % count], images[(index - 1 + count) % count]];
    setVisited(previous => {
      const urls = previous.key === resetKey ? previous.urls : [];
      if (previous.key === resetKey && adjacent.every(url => urls.includes(url))) return previous;
      return { key: resetKey, urls: [...new Set([...urls, ...adjacent])] };
    });
  }

  const frameWidth = () => frameRef.current?.clientWidth ?? 300;

  // تزامن الموضع عند تغيير index (سواء من السحب باللمس أو الضغط على المصغّرات)
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const instant = lastKeyRef.current !== resetKey;
    lastKeyRef.current = resetKey;
    const width = frameWidth();
    track.style.transition = instant ? "none" : TRACK_TRANSITION;
    track.style.transform = `translate3d(${-index * width}px, 0, 0)`;
  }, [index, resetKey]);

  // عند تدوير الهاتف أو تغيير مقاس الشاشة
  useEffect(() => {
    function onResize() {
      const track = trackRef.current;
      if (!track) return;
      track.style.transition = "none";
      track.style.transform = `translate3d(${-indexRef.current * frameWidth()}px, 0, 0)`;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // معالجة اللمس الصريح (Touch Events) لضمان الاستجابة الكاملة بالهواتف (يمين ويسار)
  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track || count < 2) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isHorizontal: boolean | null = null;
    let isDragging = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1 || !track) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = performance.now();
      isHorizontal = null;
      isDragging = false;
      track.style.transition = "none";
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1 || !frame || !track) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // تحديد نية الحركة: أفقية أم عمودية
      if (isHorizontal === null) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 7 && absY < 7) return;
        if (absX >= absY) {
          isHorizontal = true;
          isDragging = true;
        } else {
          isHorizontal = false;
          return; // تمرير عمودي عادي للصفحة
        }
      }

      if (!isHorizontal) return;

      // سحب أفقي مؤكد: نمنع المتصفح من إلغاء الإيماءة
      if (e.cancelable) e.preventDefault();

      const width = frame.clientWidth || 300;
      const currentIndex = indexRef.current;

      // بدون مقاومة عند الأطراف: المعرض دائري
      const moveX = dx;

      track.style.transform = `translate3d(${-currentIndex * width + moveX}px, 0, 0)`;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isDragging || !frame || !track) return;
      isDragging = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const elapsed = Math.max(performance.now() - startTime, 1);
      const width = frame.clientWidth || 300;
      const currentIndex = indexRef.current;

      const isFastFlick = elapsed < 320 && Math.abs(dx) > 28;
      const isFarEnough = Math.abs(dx) > Math.min(width * 0.16, 50);

      let targetIndex = currentIndex;
      if (isFastFlick || isFarEnough) {
        if (dx < 0) {
          // سحب لليسار = التالية
          targetIndex = (currentIndex + 1) % count; // بعد آخر صورة نرجع للأولى
        } else if (dx > 0) {
          // سحب لليمين = السابقة
          targetIndex = (currentIndex - 1 + count) % count; // قبل الأولى نروح للأخيرة
        }
      }

      track.style.transition = TRACK_TRANSITION;
      track.style.transform = `translate3d(${-targetIndex * width}px, 0, 0)`;

      if (targetIndex !== currentIndex) {
        onIndexChange(targetIndex);
      }
    }

    function onTouchCancel() {
      if (!isDragging || !frame || !track) return;
      isDragging = false;
      const width = frame.clientWidth || 300;
      track.style.transition = TRACK_TRANSITION;
      track.style.transform = `translate3d(${-indexRef.current * width}px, 0, 0)`;
    }

    frame.addEventListener("touchstart", onTouchStart, { passive: true });
    frame.addEventListener("touchmove", onTouchMove, { passive: false });
    frame.addEventListener("touchend", onTouchEnd, { passive: true });
    frame.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      frame.removeEventListener("touchstart", onTouchStart);
      frame.removeEventListener("touchmove", onTouchMove);
      frame.removeEventListener("touchend", onTouchEnd);
      frame.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [count, onIndexChange]);

  // دعم السحب بالماوس للكمبيوتر (Desktop Drag)
  useEffect(() => {
    const frame = frameRef.current;
    const track = trackRef.current;
    if (!frame || !track || count < 2) return;

    let startX = 0;
    let startTime = 0;
    let isMouseDown = false;

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0 || !frame || !track) return;
      isMouseDown = true;
      startX = e.clientX;
      startTime = performance.now();
      track.style.transition = "none";
      frame.style.cursor = "grabbing";

      function onMouseMove(moveEvent: MouseEvent) {
        if (!isMouseDown || !frame || !track) return;
        const dx = moveEvent.clientX - startX;
        const width = frame.clientWidth || 300;
        const currentIndex = indexRef.current;
        const moveX = dx;
        track.style.transform = `translate3d(${-currentIndex * width + moveX}px, 0, 0)`;
      }

      function onMouseUp(upEvent: MouseEvent) {
        if (!isMouseDown || !frame || !track) return;
        isMouseDown = false;
        frame.style.cursor = "";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        const dx = upEvent.clientX - startX;
        const elapsed = Math.max(performance.now() - startTime, 1);
        const width = frame.clientWidth || 300;
        const currentIndex = indexRef.current;

        const isFastFlick = elapsed < 320 && Math.abs(dx) > 28;
        const isFarEnough = Math.abs(dx) > Math.min(width * 0.16, 50);

        let targetIndex = currentIndex;
        if (isFastFlick || isFarEnough) {
          if (dx < 0) {
            targetIndex = (currentIndex + 1) % count; // بعد آخر صورة نرجع للأولى
          } else if (dx > 0) {
            targetIndex = (currentIndex - 1 + count) % count; // قبل الأولى نروح للأخيرة
          }
        }

        track.style.transition = TRACK_TRANSITION;
        track.style.transform = `translate3d(${-targetIndex * width}px, 0, 0)`;

        if (targetIndex !== currentIndex) {
          onIndexChange(targetIndex);
        }
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    frame.addEventListener("mousedown", onMouseDown);
    return () => frame.removeEventListener("mousedown", onMouseDown);
  }, [count, onIndexChange]);

  return (
    <div
      ref={frameRef}
      data-swipe-gallery
      tabIndex={0}
      onPointerDown={prepareAdjacentImages}
      aria-roledescription="carousel"
      aria-label="معرض صور الموديل"
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") onIndexChange((index + 1) % count);
        if (e.key === "ArrowRight") onIndexChange((index - 1 + count) % count);
      }}
      className={`relative select-none overflow-hidden touch-pan-y cursor-grab ${className}`.trim()}
    >
      <div ref={trackRef} dir="ltr" className="relative h-full w-full" style={{ willChange: "transform" }}>
        {images.map((src, i) => (
          <img
            key={src}
            src={i === index || (visited.key === resetKey && visited.urls.includes(src)) ? src : undefined}
            alt={i === index ? getAlt(i) : ""}
            aria-hidden={i !== index}
            draggable={false}
            decoding="async"
            style={{
              transform: `translate3d(${i * 100}%, 0, 0)`,
              userSelect: "none",
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ))}
      </div>

      {/* أسهم التنقل (موبايل وديسكتوب) - دائرية: بعد الأخيرة الأولى، وقبل الأولى الأخيرة */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="الصورة السابقة"
            onClick={() => onIndexChange((index - 1 + count) % count)}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="الصورة التالية"
            onClick={() => onIndexChange((index + 1) % count)}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
        </>
      )}

      {/* مؤشر رقم الصورة الحالي */}
      {count > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
          {index + 1} / {count}
        </div>
      )}
    </div>
  );
}
