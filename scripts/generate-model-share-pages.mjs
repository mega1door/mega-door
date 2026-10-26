// يولّد صفحة HTML ثابتة لكل موديل حقيقي (dist/model/<id>/index.html) فيها وسوم
// Open Graph صحيحة (عنوان/وصف/صورة) مكتوبة مباشرة بالـ HTML - يقرأها زاحف
// واتساب/فيسبوك مباشرة بدون تشغيل أي جافاسكربت (المكوّن React الديناميكي
// setPageSEO لا يصل لهذا الزاحف إطلاقاً لأنه لا يشغّل جافاسكربت).
//
// GitHub Pages يخدم dist/model/<id>/index.html تلقائياً لما يزور أحد
// /model/<id> أو /model/<id>/ - نفس الرابط اللي يستخدمه React Router أصلاً،
// فالزوار الحقيقيين (متصفح حقيقي يشغّل جافاسكربت) يحصلون نفس تطبيق React
// الكامل التفاعلي بعد التحميل، وفقط الزحّافات (اللي ما تشغّل جافاسكربت)
// تكتفي بمحتوى هذا الـ HTML الثابت.
//
// يشتغل تلقائياً بعد "vite build" (انظر package.json) - يحتاج اتصال إنترنت
// وقت البناء لقراءة الموديلات الحقيقية من Supabase.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

// نفس القيم العامة (anon publishable key) المستخدمة بـ src/lib/supabaseClient.ts
const SUPABASE_URL = "https://ecyxhlkkvjhensgymgdw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GrybiRkE_gvw_a5y0-jDVg_CqD82ivD";
const SITE_ORIGIN = "https://mega1door.github.io";
const BASE_PATH = "/mega-door";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAbsoluteUrl(imagePath) {
  return imagePath.startsWith("http") ? imagePath : `${SITE_ORIGIN}${imagePath}`;
}

/**
 * ⚠️ تجربة مؤقتة (موديل A1 فقط): صور Supabase Storage العامة ترجع بترويسة
 * `X-Robots-Tag: none` تمنع أي زاحف من توليد معاينة لها (انظر شرح مفصّل
 * بـ src/lib/whatsapp.ts). هذي خريطة استثناء تختبر افتراضاً: صورة مستضافة
 * على GitHub Pages نفسه (public/) - بدون هذي الترويسة - تحل مشكلة معاينة
 * الصورة المصغّرة؟ إذا نجحت التجربة، تُطبَّق على باقي الموديلات لاحقاً.
 * تُحذف هذي الخريطة تلقائياً بعد ما تنتفي الحاجة لها (تجربة، مو حل دائم).
 */
const OG_IMAGE_OVERRIDE = {
  a1: `${BASE_PATH}/images/models/a1-share.jpg`,
};

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`قالب index.html تغيّر شكله - ما لكيت النمط: ${pattern}`);
  }
  return html.replace(pattern, replacement);
}

async function fetchSupabaseDataWithRetry(maxAttempts = 3) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const [{ data: models, error: modelsError }, { data: categories, error: categoriesError }] =
        await Promise.all([
          supabase.from("models").select("id,model_number,name,category,material,color,dimensions,images"),
          supabase.from("categories").select("id,label"),
        ]);

      if (modelsError) throw modelsError;
      if (categoriesError) throw categoriesError;

      return { models: models ?? [], categories: categories ?? [] };
    } catch (err) {
      lastError = err;
      console.warn(`[محاولة ${attempt}/${maxAttempts}] تعذّر الاتصال بـ Supabase: ${err.message || err}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw new Error(`تعذّر جلب البيانات من Supabase بعد ${maxAttempts} محاولات: ${lastError?.message || lastError}`);
}

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf-8");

  const { models, categories } = await fetchSupabaseDataWithRetry(3);
  const categoryLabelById = Object.fromEntries(categories.map((c) => [c.id, c.label]));

  let written = 0;
  for (const model of models) {
    const image = model.images?.[0];
    if (!image) continue; // ما نبني صفحة مشاركة بدون صورة أصلاً

    const title = `${model.name} - ${model.model_number} | ميكا للأبواب`;
    const knownDetails = [model.material, model.color, model.dimensions ? `مقاس ${model.dimensions}` : null]
      .map((v) => v?.trim())
      .filter(Boolean);
    const description = knownDetails.length
      ? `${model.name}، موديل ${model.model_number}: ${knownDetails.join("، ")}.`
      : `${model.name}، موديل ${model.model_number} من ميكا للأبواب - بغداد.`;
    const categoryLabel = categoryLabelById[model.category] ?? "";
    const pageUrl = `${SITE_ORIGIN}${BASE_PATH}/model/${model.id}`;
    const imageUrl = OG_IMAGE_OVERRIDE[model.id]
      ? `${SITE_ORIGIN}${OG_IMAGE_OVERRIDE[model.id]}`
      : toAbsoluteUrl(image);

    let html = template;
    html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = replaceTag(
      html,
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    );
    html = replaceTag(
      html,
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`
    );
    html = replaceTag(
      html,
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${escapeHtml(title)}" />`
    );
    html = replaceTag(
      html,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    );
    html = replaceTag(
      html,
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`
    );
    html = replaceTag(
      html,
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n` +
        `    <meta property="og:image:alt" content="${escapeHtml(title)}" />\n` +
        (categoryLabel ? `    <meta property="product:category" content="${escapeHtml(categoryLabel)}" />\n` : "") +
        `    <meta name="twitter:card" content="summary_large_image" />\n` +
        `    <meta name="twitter:title" content="${escapeHtml(title)}" />\n` +
        `    <meta name="twitter:description" content="${escapeHtml(description)}" />\n` +
        `    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    );
    html = replaceTag(
      html,
      /<meta property="og:type" content="[^"]*" \/>/,
      `<meta property="og:type" content="product" />`
    );

    const outDir = path.join(distDir, "model", model.id);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf-8");
    written++;
  }

  console.log(`generate-model-share-pages: تم توليد ${written} صفحة مشاركة بـ dist/model/<id>/index.html`);
}

// معالجة الأخطاء وحماية النشر:
// إذا حدث خطأ بالاتصال بـ Supabase أثناء تشغيل GitHub Actions (سواء المجدول كل ساعة أو اليدوي)،
// يجب إيقاف البناء برمز خطأ (exit 1) حتى لا يقوم GitHub Pages بنشر نسخة فارغة تمسح صفحات المعاينة الحالية.
main().catch((err) => {
  console.error("❌ فشل سكربت generate-model-share-pages:", err.message || err);

  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  if (isCI) {
    console.error("🚨 تم إيقاف عملية النشر في GitHub Actions لحماية صفحات المعاينة الحالية من الحذف أو التلف.");
    process.exit(1);
  } else {
    console.warn("⚠️ تم تخطي توليد صفحات المعاينة للبناء المحلي دون إيقاف التطوير.");
    process.exitCode = 0;
  }
});
