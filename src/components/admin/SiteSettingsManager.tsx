import { useRef, useState } from "react";
import { useSiteSettings, updateHeroImage } from "../../lib/siteSettingsStore";
import { uploadImage } from "../../lib/imageUpload";

/** إدارة صورة الهيرو (الصورة الرئيسية بأعلى الصفحة الرئيسية) من لوحة الإدارة. */
export default function SiteSettingsManager() {
  const settings = useSiteSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file, "site");
      await updateHeroImage(url);
    } catch (err) {
      console.error(err);
      setError("تعذّر رفع الصورة. تأكد من اتصالك بالإنترنت وجرّب مرة أخرى.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-white/20 bg-surface p-5 sm:p-6 shadow-lg">
      <h2 className="text-lg font-bold text-ink">صورة الهيرو</h2>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-200">
        صورة الهيرو (أول صورة يشوفها الزائر بأعلى الصفحة الرئيسية).
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="h-24 w-32 overflow-hidden rounded-lg border border-white/20 bg-canvas">
          {settings.heroImageUrl ? (
            <img src={settings.heroImageUrl} alt="صورة الهيرو الحالية" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs sm:text-sm font-medium text-slate-400">الصورة الافتراضية</div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:text-brand hover:bg-brand/10 disabled:opacity-60"
        >
          {busy ? "...جارِ الرفع" : "تغيير صورة الهيرو"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
    </div>
  );
}
