import { useState, useEffect } from "react";
import { uploadImage } from "../../lib/imageUpload"; // utilizes imageResize.ts for client‑side WebP compression
import { useSiteSettings, updateHeroImages } from "../../lib/siteSettingsStore";
import { getFullImageUrl } from "../../lib/imageUrl";

interface ImageSlot {
  url: string | null; // existing URL from DB
  file: File | null; // newly selected file
  preview: string | null; // object URL for preview
}

export default function HeroImageManager() {
  const { heroImages } = useSiteSettings();
  const [slots, setSlots] = useState<ImageSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Initialise slots from DB (max 8)
  useEffect(() => {
    const init: ImageSlot[] = [];
    for (let i = 0; i < 8; i++) {
      init.push({
        url: heroImages && heroImages[i] ? heroImages[i] : null,
        file: null,
        preview: null,
      });
    }
    setSlots(init);
  }, [heroImages]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setSlots((prev) => {
      const newSlots = [...prev];
      if (newSlots[index].preview) URL.revokeObjectURL(newSlots[index].preview!);
      newSlots[index] = { ...newSlots[index], file, preview };
      return newSlots;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSlots((prev) => {
      const newSlots = [...prev];
      [newSlots[index - 1], newSlots[index]] = [newSlots[index], newSlots[index - 1]];
      return newSlots;
    });
  };

  const moveDown = (index: number) => {
    if (index === 7) return;
    setSlots((prev) => {
      const newSlots = [...prev];
      [newSlots[index], newSlots[index + 1]] = [newSlots[index + 1], newSlots[index]];
      return newSlots;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const newUrls: (string | null)[] = [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.file) {
          const url = await uploadImage(slot.file, "site");
          newUrls.push(url);
        } else {
          newUrls.push(slot.url);
        }
      }
      await updateHeroImages(newUrls as string[]);
      setMessage("✅ تم حفظ الصور بنجاح وسيتظهر التحديث الآن عند إعادة تحميل الصفحة.");
    } catch (err) {
      console.error(err);
      setMessage("❌ فشل الحفظ. سيبقى الإعدادات الحالية كما هي.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-white/20 bg-surface p-6 shadow-2xl">
      <h2 className="mb-4 text-2xl font-display font-bold text-ink">إدارة صور الهيرو</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {slots.map((slot, idx) => (
          <div key={idx} className="flex flex-col items-center space-y-2">
            <div className="relative h-32 w-32 rounded-md overflow-hidden bg-canvas border border-white/20">
              {slot.preview ? (
                <img src={slot.preview} alt={`معاينة ${idx + 1}`} className="h-full w-full object-cover" />
              ) : slot.url ? (
                <img src={getFullImageUrl(slot.url)} alt={`صورة ${idx + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">بدون صورة</div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(idx, e)}
              disabled={saving}
              className="text-sm text-slate-200"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0 || saving}
                className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
              >↑</button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === 7 || saving}
                className="rounded-full bg-brand px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
              >↓</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "جاري الحفظ…" : "حفظ جميع الصور"}
        </button>
        {message && <span className="text-sm font-medium text-ink">{message}</span>}
      </div>
    </section>
  );
}
