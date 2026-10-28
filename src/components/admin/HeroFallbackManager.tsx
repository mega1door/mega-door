import { useRef, useState } from "react";
import { useSiteSettings, updateHeroImages } from "../../lib/siteSettingsStore";
import { uploadImage } from "../../lib/imageUpload";
import { splitHeroImages, MAX_FALLBACK_HERO } from "../../lib/heroImages";

/**
 * صور الهيرو الاحتياطية (حتى 3): تظهر وتتبدّل بالهيرو إذا ما اكو موديلات مختارة لـ«وصل حديثاً».
 * تُرفع لمجلد site/ وتُحفظ بنفس حقل site_settings.hero_images (بدون تعديل قاعدة البيانات).
 */
export default function HeroFallbackManager() {
  const { heroImages } = useSiteSettings();
  const { modelUrls, fallbackUrls } = splitHeroImages(heroImages);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(next: string[], ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await updateHeroImages([...modelUrls, ...next]);
      setMsg({ ok: true, text: ok });
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, text: "تعذّر الحفظ. تأكدي من الاتصال وجرّبي مرة ثانية." });
    } finally {
      setBusy(false);
    }
  }

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_FALLBACK_HERO - fallbackUrls.length;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (inputRef.current) inputRef.current.value = "";
    if (list.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const urls: string[] = [];
      for (const f of list) urls.push(await uploadImage(f, "site"));
      await save([...fallbackUrls, ...urls], "انضافت الصور.");
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, text: "تعذّر رفع الصورة. تأكدي من الاتصال وجرّبي مرة ثانية." });
      setBusy(false);
    }
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= fallbackUrls.length) return;
    const next = [...fallbackUrls];
    [next[i], next[j]] = [next[j], next[i]];
    void save(next, "انحفظ الترتيب.");
  }

  return (
    <div className="admin-card mb-6 space-y-4">
      <div>
        <h2>صور الهيرو الاحتياطية</h2>
        <p className="admin-hint mt-1">
          حتى {MAX_FALLBACK_HERO} صور ترفعيها مباشرة بدون موديل. تتبدّل بالهيرو كل 4 ثواني إذا ما اكو موديلات مختارة لـ«وصل حديثاً».
        </p>
      </div>

      {msg && <p className={msg.ok ? "admin-ok" : "admin-alert"}>{msg.text}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {fallbackUrls.map((url, i) => (
          <div key={url} className="overflow-hidden rounded-lg border border-[#2a3448] bg-[#0b0f17]">
            <div className="relative aspect-[16/10]">
              <img src={url} alt={`صورة احتياطية ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 text-[14px]">{i + 1}</span>
            </div>
            <div className="flex gap-1.5 p-2">
              <button type="button" className="admin-btn admin-btn-sm" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="تقديم">
                ↑
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => move(i, 1)}
                disabled={busy || i === fallbackUrls.length - 1}
                aria-label="تأخير"
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-danger flex-1"
                onClick={() => save(fallbackUrls.filter((u) => u !== url), "انحذفت الصورة.")}
                disabled={busy}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {fallbackUrls.length < MAX_FALLBACK_HERO && (
          <button type="button" className="admin-drop min-h-[140px] justify-center" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "جارِ الرفع…" : "+ إضافة صورة"}
            <span className="admin-hint">
              {fallbackUrls.length} من {MAX_FALLBACK_HERO}
            </span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
    </div>
  );
}
