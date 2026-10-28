import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useModels } from "../lib/modelsStore";
import { getPopularModels } from "../data/models";
import { useCategories } from "../lib/categoriesStore";
import { useSiteSettings } from "../lib/siteSettingsStore";
import { setPageSEO } from "../lib/seo";
import { modelMetadata } from "../lib/catalogMetadata";
import CircularCarousel from "../components/CircularCarousel";
import MobileHero from "../components/MobileHero";
import PopularSlider from "../components/PopularSlider";
import MobileCatalog from "../components/MobileCatalog";
import DesktopCatalog from "../components/DesktopCatalog";
import { getThumbnailUrl, getFullImageUrl } from "../lib/imageUrl";
import { splitHeroImages } from "../lib/heroImages";

/** الكاروسيل الدائري القديم بالهيرو - موقوف حالياً، غيّريه لـ true لإرجاعه بالديسكتوب. */
const SHOW_LEGACY_CAROUSEL_HERO = false;

export default function HomePage() {
  const models = useModels();
  const popularModels = getPopularModels(models);
  const categories = useCategories();
  const { heroImageUrl, heroImages } = useSiteSettings();
  const heroFallback = heroImageUrl || `${import.meta.env.BASE_URL}images/brand/hero-door.jpg`;

  // صور الكاروسيل: صورة رئيسية لكل موديل حقيقي أولاً، ثم صور إضافية من معارض
  // الموديلات حتى 10 كحد أقصى (كل الصور من بيانات الموقع، بدون صور تجريبية).
  const heroItems = useMemo(() => {
    if (heroImages && heroImages.length > 0) {
      return heroImages.map((url, idx) => ({
        src: getFullImageUrl(url),
        alt: `صورة هيرو ${idx + 1}`,
      }));
    }
    // fallback to previous logic (models & fallback)
    const seen = new Set<string>();
    const items: { src: string; alt: string }[] = [];
    const add = (src: string | undefined, alt: string) => {
      if (!src || seen.has(src) || items.length >= 10) return;
      seen.add(src);
      items.push({ src: getThumbnailUrl(src), alt });
    };
    models.forEach((m) => add(m.images[0], `باب ${m.name}`));
    models.forEach((m) => m.images.slice(1).forEach((src) => add(src, `باب ${m.name}`)));
    if (items.length === 0) add(heroFallback, "باب من ميكا للأبواب");
    return items;
  }, [models, heroFallback, heroImages]);
  const primaryCategoryPath = categories[0] ? `/${categories[0].id}` : "/interior";

  // هيرو الموبايل: صور الهيرو المرفوعة من لوحة الإدارة أولاً (بنفس ترتيبها)، وإذا
  // ما فيه صور مرفوعة بعد، الصورة الافتراضية الحالية للموقع.
  // الهيرو (كل الشاشات): صورة وحدة من إعدادات الموقع (hero_image_url)، وإذا ما مرفوعة
  // الصورة الافتراضية. نظام الثماني صور (hero_images) والكاروسيل الدائري باقيين بالكود بدون عرض.
  // موديلات الهيرو: يختارها الأدمن من تبويب «الهيرو»، وتُحفظ بنفس حقل site_settings.hero_images
  // (روابط صورها الموجودة أصلاً بـ Supabase). كل رابط يتطابق مع موديله، والمحذوف يُتجاهل.
  const heroModels = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof models = [];
    for (const url of splitHeroImages(heroImages).modelUrls) {
      const full = getFullImageUrl(url);
      const m = models.find((x) => x.images.some((img) => getFullImageUrl(img) === full));
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        out.push({ ...m, images: [full, ...m.images.filter((img) => getFullImageUrl(img) !== full)] });
      }
    }
    return out;
  }, [heroImages, models]);

  // شرائح «وصل حديثاً»: بنفس ترتيب الأدمن (مو حسب تاريخ الإضافة)، كل صورة تفتح صفحة موديلها
  const heroModelSlides = useMemo(
    () =>
      heroModels.map((m) => ({
        src: m.images[0],
        alt: modelMetadata(m).alt,
        href: `/model/${m.id}`,
        fit: "contain" as const,
      })),
    [heroModels]
  );

  // صور الهيرو الاحتياطية (حتى 3) - تظهر إذا ما اكو موديلات مختارة
  const fallbackSlides = useMemo(
    () =>
      splitHeroImages(heroImages).fallbackUrls.map((src, i) => ({
        src,
        alt: `ميكا للأبواب - صورة ${i + 1}`,
      })),
    [heroImages]
  );

  const heroSlides = useMemo(
    () => [{ src: heroFallback, alt: "باب من ميكا للأبواب داخل مدخل منزل" }],
    [heroFallback]
  );

  useEffect(() => {
    setPageSEO({
      title: "ميكا للأبواب | أبواب داخلية وخارجية وقواطع في بغداد والعراق",
      description:
        "تصفح كتالوج ميكا للأبواب: أبواب داخلية وخارجية وقواطع داخلية بتصاميم وقياسات متعددة في بغداد. استفسر مباشرة عبر واتساب.",
      path: "/",
    });
  }, []);

  return (
    <div>
      {/* الترتيب (موبايل وديسكتوب): الهيرو «وصل حديثاً» ← الأكثر طلباً ← أقسام الموديلات */}
      <MobileHero
        slides={heroModels.length > 0 ? heroModelSlides : fallbackSlides.length > 0 ? fallbackSlides : heroSlides}
        ctaTo={primaryCategoryPath}
        ctaLabel="وصل حديثاً"
      />

      {/* الأكثر طلباً هذا الشهر - نفس التصميم القديم، صار مباشرة تحت الهيرو. القسم كامل
          يختفي إذا ما فيه أي موديل معلّم "الأكثر طلباً" من لوحة الإدارة. */}
      {popularModels.length > 0 && (
        <section className="pb-4 pt-12 lg:pb-6 lg:pt-20">
          <div className="mx-auto max-w-content px-4 sm:px-6">
            <div className="mb-10 text-right">
              <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold text-ink">الأكثر طلباً هذا الشهر</h2>
              <p className="mt-2.5 text-base text-muted">تصاميم مختارة لبيوت عصرية</p>
            </div>
            <PopularSlider models={popularModels} />
          </div>
        </section>
      )}

      {/* أقسام الموديلات - نفس التصميم القديم: أزرار الأقسام وموديلاتها بالموبايل،
          وبطاقات الأقسام بالديسكتوب */}
      <div className="lg:hidden">
        <MobileCatalog />
      </div>
      <div className="hidden pt-8 lg:block">
        <DesktopCatalog />
      </div>

      {/* ===== الديسكتوب (lg فأكبر) - بدون تغيير بانتظار اعتماد تصميمه ===== */}
      {/* Hero */}
      {/* bg-canvas انحذفت هنا عمداً (مو تغيير لون - نفس لون body بالضبط) حتى تظهر طبقة
          الخلفية الثابتة (AmbientBackground: خطوط هندسية متحركة) من خلفه. */}
      {/* الهيرو القديم بالكاروسيل الدائري: موقوف (ما ينعرض ولا يشتغل) - الكود محفوظ للاستخدام لاحقاً */}
      {SHOW_LEGACY_CAROUSEL_HERO && (
      <section className="hidden overflow-hidden border-b border-border lg:block">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            {/*
              ترتيب الـ DOM ثابت (الصورة أولاً) حتى يبقى ظهورها فوق النص على الجوال والتابلت
              (أقل من 1024px). من عرض 1024px فأكبر (lg) نستخدم order لعكس الأعمدة بصرياً فقط:
              النص (order-1) يشغل العمود الأول وهو أقصى اليمين في RTL، والصورة (order-2) تشغل
              العمود الثاني الأكبر مساحة (1.05fr) أقصى اليسار، لتبقى هي محور التركيز البصري.
            */}
            <div
              data-swipe-gallery
              className="door-glow h-[340px] overflow-hidden rounded-[22px] bg-surface sm:h-[400px] lg:order-2 lg:h-[460px]"
              style={{
                // خلفية CSS ثابتة فقط (soft blue ambient glow): توهج أزرق ناعم خلف الكاروسيل
                // + توهج خفيف جداً من الأسفل للعمق. بدون صور وبدون حركة = بدون كلفة أداء.
                backgroundImage:
                  "radial-gradient(ellipse 70% 62% at 50% 46%, rgba(20,137,255,0.24) 0%, rgba(20,137,255,0.10) 45%, rgba(20,137,255,0) 75%), radial-gradient(ellipse 80% 38% at 50% 104%, rgba(89,170,255,0.16) 0%, rgba(89,170,255,0) 70%)",
              }}
            >
              <CircularCarousel
                items={heroItems}
                preset="cylinder"
                curve={1}
                intro="rise"
                cardWidth={200}
                aspectRatio={0.8}
                speed={14}
                fadeColor="#0F1424"
                cornerRadius={14}
              />
            </div>
            <div className="lg:order-1">
              <p className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-brand-dark md:mb-4">
                <span className="inline-block h-[1.5px] w-[22px] bg-brand-dark" />
                أكثر من مجرد باب
              </p>
              <h1 className="text-balance font-display text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.22] text-ink">
                الباب الذي يناسب حياتك
              </h1>
              <p className="mt-3.5 max-w-[40ch] text-[15.5px] text-muted md:mt-5">
                تصاميم عصرية .. جودة تدوم لبيوت أجمل وحياة أهدأ
              </p>
              <div className="mt-6 md:mt-9">
                <Link
                  to={primaryCategoryPath}
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition hover:brightness-[1.06]"
                >
                  اكتشف الموديلات
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l-7 7 7 7M20 12H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
