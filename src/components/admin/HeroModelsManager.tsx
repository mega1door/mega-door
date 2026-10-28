import { useEffect, useMemo, useState } from "react";
import { useModels } from "../../lib/modelsStore";
import { useSiteSettings, updateHeroImages } from "../../lib/siteSettingsStore";
import { getFullImageUrl, getThumbnailUrl, handleThumbError } from "../../lib/imageUrl";

/**
 * «وصل حديثاً» بالهيرو: اختيار موديلات الهيرو وترتيبها (يظهر بنفس ترتيب الأدمن).
 * يُحفظ بنفس الحقل الموجود site_settings.hero_images (روابط صور الموديلات الموجودة أصلاً
 * بـ Supabase، بدون رفع جديد) - فما يحتاج أي تعديل بقاعدة البيانات.
 */
export default function HeroModelsManager() {
  const models = useModels();
  const { heroImages } = useSiteSettings();
  const [ids, setIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // الحالة المحفوظة: كل رابط → موديله (المحذوف يُتجاهل)
  const savedIds = useMemo(() => {
    const out: string[] = [];
    for (const url of heroImages ?? []) {
      const full = getFullImageUrl(url);
      const m = models.find((x) => x.images.some((img) => getFullImageUrl(img) === full));
      if (m && !out.includes(m.id)) out.push(m.id);
    }
    return out;
  }, [heroImages, models]);

  useEffect(() => {
    if (!dirty) setIds(savedIds);
  }, [savedIds, dirty]);

  const chosen = ids.map((id) => models.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m);
  const available = models.filter(
    (m) =>
      !ids.includes(m.id) &&
      m.images.length > 0 &&
      (!q.trim() || [m.modelNumber, m.name, m.color ?? ""].join(" ").toLowerCase().includes(q.trim().toLowerCase()))
  );

  function change(next: string[]) {
    setIds(next);
    setDirty(true);
    setMsg(null);
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const urls = chosen.map((m) => m.images[0]);
      await updateHeroImages(urls);
      setDirty(false);
      setMsg({ ok: true, text: "انحفظ ترتيب الهيرو." });
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, text: "تعذّر الحفظ. تأكدي من الاتصال وجرّبي مرة ثانية." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-card mb-6 space-y-4">
      <div>
        <h2>وصل حديثاً (صور الهيرو)</h2>
        <p className="admin-hint mt-1">
          اختاري الموديلات اللي تظهر بأعلى الصفحة الرئيسية ورتّبيها. كل صورة تفتح صفحة موديلها. إذا ما اخترتي شي، تظهر صورة الهيرو الثابتة.
        </p>
      </div>

      {msg && <p className={msg.ok ? "admin-ok" : "admin-alert"}>{msg.text}</p>}

      {chosen.length === 0 ? (
        <p className="admin-hint">ما اكو موديلات مختارة.</p>
      ) : (
        <ol className="divide-y divide-[#2a3448] overflow-hidden rounded-lg border border-[#2a3448]">
          {chosen.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-6 text-center text-[#b4bccb]">{i + 1}</span>
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md border border-[#2a3448] bg-[#0b0f17]">
                <img
                  src={getThumbnailUrl(m.images[0])}
                  alt=""
                  onError={(e) => handleThumbError(e, m.images[0])}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span dir="ltr" className="font-bold [unicode-bidi:isolate]">
                    {m.modelNumber}
                  </span>{" "}
                  · {m.name}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" className="admin-btn admin-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="تقديم">
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm"
                  onClick={() => move(i, 1)}
                  disabled={i === chosen.length - 1}
                  aria-label="تأخير"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-danger"
                  onClick={() => change(ids.filter((x) => x !== m.id))}
                  aria-label={`إزالة ${m.name}`}
                >
                  إزالة
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {picking ? (
        <div className="space-y-3 rounded-lg border border-[#2a3448] p-3">
          <div className="flex gap-2">
            <input className="admin-input" placeholder="ابحثي بالاسم أو الكود أو اللون" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="button" className="admin-btn" onClick={() => setPicking(false)}>
              تم
            </button>
          </div>
          {available.length === 0 ? (
            <p className="admin-hint">ما اكو موديلات ثانية.</p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
              {available.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => change([...ids, m.id])}
                  className="flex items-center gap-2 rounded-lg border border-[#2a3448] p-2 text-right transition hover:border-[#3d9bff]"
                >
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-[#0b0f17]">
                    <img src={getThumbnailUrl(m.images[0])} alt="" onError={(e) => handleThumbError(e, m.images[0])} className="h-full w-full object-contain" />
                  </div>
                  <span className="min-w-0 truncate text-[14px]">
                    + <span dir="ltr" className="[unicode-bidi:isolate]">{m.modelNumber}</span> · {m.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="admin-btn" onClick={() => setPicking(true)}>
          + إضافة موديلات للهيرو
        </button>
      )}

      <div className="flex gap-2">
        <button type="button" className="admin-btn admin-btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving ? "جارِ الحفظ…" : "حفظ الهيرو"}
        </button>
        {dirty && (
          <button
            type="button"
            className="admin-btn"
            onClick={() => {
              setIds(savedIds);
              setDirty(false);
            }}
          >
            تراجع
          </button>
        )}
      </div>
    </div>
  );
}
