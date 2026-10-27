import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";

export interface MobileHeroSlide {
  src: string;
  alt: string;
}

const AUTOPLAY_MS = 5500;
const SWIPE_MIN = 40;

/**
 * هيرو الموبايل حسب التصميم المعتمد: صورة معمارية بعرض الشاشة، النص وزر
 * «اكتشف مجموعتنا» فوقها جهة اليمين، ونقاط التبديل بالأسفل.
 *
 * الصور نفسها تأتي من لوحة الإدارة (site_settings.hero_images عبر HomePage) -
 * هذا المكوّن يعرضها فقط. تبديل تلقائي هادئ بالتلاشي + سحب باللمس + النقاط.
 * التبديل التلقائي يتوقف عند prefers-reduced-motion أو لما تكون صورة واحدة.
 */
export default function MobileHero({ slides, ctaTo }: { slides: MobileHeroSlide[]; ctaTo: string }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const startX = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  // لو تغيّر عدد الصور (مثلاً بعد وصول صور الأدمن من Supabase) نرجع لأول صورة
  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    setPaused(true);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const from = startX.current;
    startX.current = null;
    setPaused(false);
    if (from === null || count < 2) return;
    const dx = e.clientX - from;
    if (Math.abs(dx) < SWIPE_MIN) return;
    // RTL: السحب لليمين يجيب الصورة التالية (نفس اتجاه قراءة الموقع)
    setIndex((i) => (dx > 0 ? (i + 1) % count : (i - 1 + count) % count));
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="صور ميكا للأبواب"
      data-swipe-gallery
      className="relative aspect-[390/250] w-full overflow-hidden bg-charcoal-deep"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startX.current = null;
        setPaused(false);
      }}
      style={{ touchAction: "pan-y" }}
    >
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.alt}
          aria-hidden={i !== index}
          draggable={false}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          {...(i === 0 ? { fetchpriority: "high" } : {})}
          className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-700 ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* تعتيم جهة النص فقط (اليمين) حتى يبقى مقروءاً فوق أي صورة يرفعها الأدمن */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(8,12,15,0.78)_0%,rgba(8,12,15,0.45)_42%,rgba(8,12,15,0)_70%),linear-gradient(to_top,rgba(8,12,15,0.55)_0%,rgba(8,12,15,0)_32%)]"
      />

      <div className="absolute inset-y-0 right-0 flex w-[64%] flex-col justify-center pe-4 ps-2 text-right">
        <h1 className="font-body text-[26px] font-bold leading-[1.3] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
          بوابتكم نحو
          <span className="block text-bronze-light">الفخامة والأمان</span>
        </h1>
        <p className="mt-1.5 text-[12.5px] font-semibold leading-5 text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
          ميكا للأبواب: حيث يلتقي التصميم بالمتانة
        </p>
        <Link
          to={ctaTo}
          className="mt-3.5 inline-flex h-11 items-center gap-1.5 self-start rounded-[10px] bg-bronze px-4 text-[14px] font-bold text-charcoal shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
        >
          اكتشف مجموعتنا
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-0.5">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`عرض الصورة ${i + 1}`}
              aria-current={i === index}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`block h-[7px] w-[7px] rounded-full transition-colors duration-300 ${
                  i === index ? "bg-white" : "bg-white/45"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
