import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";

export interface MobileHeroSlide {
  src: string;
  alt: string;
  /** رابط صفحة الموديل (صور «وصل حديثاً» المختارة من الأدمن) - الصورة والزر يفتحانها */
  href?: string;
  /** "contain": صورة باب كاملة بدون قص فوق خلفية من نفس الصورة مموّهة (لصور الموديلات) */
  fit?: "cover" | "contain";
}

const AUTOPLAY_MS = 4000;
const SWIPE_MIN = 40;

/**
 * الهيرو (موبايل وديسكتوب) حسب التصميم المعتمد: صورة معمارية بعرض الشاشة، النص وزر
 * «اكتشف مجموعتنا» فوقها جهة اليمين، ونقاط التبديل بالأسفل.
 *
 * الصور نفسها تأتي من لوحة الإدارة (site_settings.hero_images عبر HomePage) -
 * هذا المكوّن يعرضها فقط. تبديل تلقائي هادئ بالتلاشي + سحب باللمس + النقاط.
 * تبديل تلقائي كل 4 ثواني بحلقة لا نهائية (تلاشي بدون تحريك)، وصورة وحدة = ثابتة.
 */
export default function MobileHero({
  slides,
  ctaTo,
  ctaLabel = "وصل حديثاً",
}: {
  slides: MobileHeroSlide[];
  ctaTo: string;
  ctaLabel?: string;
}) {
  const moved = useRef(false);
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const startX = useRef<number | null>(null);
  // الصورة السابقة تبقى ظاهرة تحت الحالية لحد ما يكمل التلاشي (بدون وميض للخلفية)
  const [prev, setPrev] = useState<number | null>(null);
  // يتغيّر مع كل تفاعل يدوي حتى يبدأ عدّ الـ 4 ثواني من جديد
  const [interaction, setInteraction] = useState(0);

  function goTo(next: number) {
    if (count < 2) return;
    setIndex((cur) => {
      const n = ((next % count) + count) % count;
      if (n !== cur) setPrev(cur);
      return n;
    });
  }

  // لو تغيّر عدد الصور (مثلاً بعد وصول صور الأدمن من Supabase) نرجع لأول صورة
  useEffect(() => {
    setIndex(0);
    setPrev(null);
  }, [count]);

  // تبديل تلقائي كل 4 ثواني بحلقة لا نهائية (بعد الأخيرة الأولى). المؤقت يبدأ من جديد بعد
  // كل تبديل أو تفاعل يدوي، فالتنقل اليدوي ما يوقف الحركة. يشتغل حتى مع «تقليل الحركة»
  // لأن الانتقال تلاشي هادئ بدون أي تحريك. صورة وحدة = ثابتة.
  useEffect(() => {
    if (count < 2) return;
    const id = window.setTimeout(() => {
      if (document.hidden) setInteraction((n) => n + 1);
      else goTo(index + 1);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, interaction]);

  const current = slides[index] as MobileHeroSlide | undefined;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    startX.current = e.clientX;
    moved.current = false;
    setInteraction((n) => n + 1);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const from = startX.current;
    startX.current = null;
    if (from === null || count < 2) return;
    const dx = e.clientX - from;
    if (Math.abs(dx) > 8) moved.current = true; // سحب: لا نفتح رابط الصورة
    if (Math.abs(dx) < SWIPE_MIN) return;
    // RTL: السحب لليمين يجيب الصورة التالية (نفس اتجاه قراءة الموقع)
    goTo(dx > 0 ? index + 1 : index - 1);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="صور ميكا للأبواب"
      data-swipe-gallery
      className="relative aspect-[390/250] w-full overflow-hidden bg-charcoal-deep lg:aspect-auto lg:h-[min(70vh,640px)] lg:min-h-[460px]"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startX.current = null;
      }}
      style={{ touchAction: "pan-y" }}
    >
      {slides.map((s, i) => (
        <div
          key={s.src}
          aria-hidden={i !== index}
          className={`absolute inset-0 ${
            i === index ? "opacity-100 transition-opacity duration-700 ease-out" : i === prev ? "opacity-100" : "opacity-0"
          }`}
          // الحالية فوق، والسابقة تحتها مباشرة لحد ما يكمل التلاشي
          style={{ zIndex: i === index ? 2 : i === prev ? 1 : 0 }}
          onTransitionEnd={() => i === index && setPrev(null)}
        >
          {(

            <img
              src={s.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`${s.fit === "contain" ? "" : "hidden lg:block "}absolute inset-0 h-full w-full scale-110 select-none object-cover opacity-45 blur-2xl`}
            />
          )}
          <img
            src={s.src}
            alt={s.alt}
            draggable={false}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            {...(i === 0 ? { fetchpriority: "high" } : {})}
            className={`absolute inset-0 h-full w-full select-none ${
              s.fit === "contain" ? "object-contain object-left py-3 pl-3 lg:py-6 lg:pl-[max(1.5rem,calc((100vw_-_1280px)/2_+_1.5rem))]" : "object-cover"
            }`}
          />
        </div>
      ))}

      {/* الصورة الحالية كلها رابط لصفحة موديلها (إذا موجود) */}
      {current?.href && (
        <Link
          to={current.href}
          aria-label={current.alt}
          className="absolute inset-0 z-[4]"
          onClick={(e) => {
            if (moved.current) e.preventDefault();
          }}
        />
      )}

      {/* تعتيم جهة النص فقط (اليمين) حتى يبقى مقروءاً فوق أي صورة يرفعها الأدمن */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_left,rgba(8,12,15,0.78)_0%,rgba(8,12,15,0.45)_42%,rgba(8,12,15,0)_70%),linear-gradient(to_top,rgba(8,12,15,0.55)_0%,rgba(8,12,15,0)_32%)]"
      />

      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] flex w-[64%] flex-col justify-end pb-5 pe-4 ps-2 text-right lg:w-[46%] lg:translate-y-2 lg:pb-16 lg:ps-[max(1.5rem,calc((100vw_-_1280px)/2_+_1.5rem))]">
        <h1 className="font-body text-[23px] font-bold leading-[1.3] lg:text-[36px] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
          بوابتكم نحو
          <span className="block text-bronze-light">الفخامة والأمان</span>
        </h1>
        <p className="mt-1.5 text-[11.5px] font-semibold leading-5 lg:mt-2.5 lg:text-[16px] lg:leading-[1.6] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
          ميكا للأبواب: حيث يلتقي التصميم بالمتانة
        </p>
        <Link
          to={current?.href ?? ctaTo}
          className="pointer-events-auto mt-3.5 inline-flex h-11 items-center gap-1.5 self-start rounded-[10px] bg-bronze px-4 text-[14px] lg:mt-5 lg:h-12 lg:px-6 lg:text-[16px] font-bold text-charcoal shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
        >
          {ctaLabel}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-2.5 z-[5] flex justify-center gap-0.5">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => {
                goTo(i);
                setInteraction((n) => n + 1);
              }}
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
