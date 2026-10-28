import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { addModel } from "../../lib/modelsStore";
import { useCategories } from "../../lib/categoriesStore";
import { useSpecTemplates } from "../../lib/specTemplatesStore";
import { uploadImage } from "../../lib/imageUpload";

/**
 * إضافة موديلات بالجملة: عدة صور تشترك بنفس المعلومات وتختلف باللون.
 * كل صورة = موديل مستقل (صفحة /model/<id> ورابط مشاركة خاص) عبر نفس دالة addModel
 * الحالية، فالمعرّف الفريد يتولّد بنفس الطريقة (والحفظ يصير باب ورا باب حتى ما يتصادمون).
 * الكود = الكود الأساسي + رقم تسلسلي، والاسم = الاسم المشترك + اللون (فيطلع بالبحث باللون).
 */
type Item = { key: string; file: File; preview: string; color: string };

export default function BulkModelForm({ onDone, onCancel }: { onDone: (count: number) => void; onCancel: () => void }) {
  const categories = useCategories();
  const templates = useSpecTemplates();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [material, setMaterial] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [usage, setUsage] = useState("");
  const [specs, setSpecs] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0].id);
  }, [categories, category]);

  // تحرير روابط المعاينة المحلية عند الخروج
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), color: "" }));
    setItems((cur) => [...cur, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeItem(key: string) {
    setItems((cur) => {
      const it = cur.find((i) => i.key === key);
      if (it) URL.revokeObjectURL(it.preview);
      return cur.filter((i) => i.key !== key);
    });
  }

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setMaterial(t.material ?? "");
    setUsage(t.usage ?? "");
    setSpecs((t.specs ?? []).join("\n"));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return setError("اختاري الصور أولاً.");
    if (!name.trim() || !code.trim()) return setError("اكتبي الاسم المشترك والكود الأساسي.");
    const missing = items.findIndex((i) => !i.color.trim());
    if (missing >= 0) return setError(`اكتبي لون الصورة رقم ${missing + 1}.`);

    const specList = specs.split("\n").map((s) => s.trim()).filter(Boolean);
    let saved = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        setSaving(`جارِ حفظ ${i + 1} من ${items.length}…`);
        const it = items[i];
        const url = await uploadImage(it.file, "models");
        await addModel({
          modelNumber: `${code.trim()}-${i + 1}`,
          name: `${name.trim()} - ${it.color.trim()}`,
          category,
          material: material.trim() || undefined,
          color: it.color.trim(),
          dimensions: dimensions.trim() || undefined,
          usage: usage.trim() || undefined,
          specs: specList.length ? specList : undefined,
          images: [url],
          isPopular: false,
        });
        saved++;
      }
      onDone(saved);
    } catch (err) {
      console.error(err);
      setError(
        saved > 0
          ? `انحفظ ${saved} من ${items.length}، وتعذّر حفظ الباقي. تأكدي من الاتصال وأضيفي الصور المتبقية مرة ثانية.`
          : "تعذّر الحفظ. تأكدي من اتصالك بالإنترنت وجرّبي مرة أخرى."
      );
      if (saved > 0) setItems((cur) => cur.slice(saved));
    } finally {
      setSaving(null);
    }
  }

  const base = code.trim() || "الكود";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="admin-alert">{error}</p>}

      <section className="admin-card space-y-3">
        <h3 className="admin-h3">١ · الصور</h3>
        <button type="button" className="admin-drop" onClick={() => inputRef.current?.click()} disabled={!!saving}>
          اختاري عدة صور مرة وحدة من الجهاز
          <span className="admin-hint">كل صورة تصير موديل مستقل بصفحة ورابط خاص</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </section>

      <section className="admin-card space-y-3">
        <h3 className="admin-h3">٢ · المعلومات المشتركة</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="admin-field">
            <span className="admin-label">القسم</span>
            <select className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {templates.length > 0 && (
            <label className="admin-field">
              <span className="admin-label">قالب مواصفات (تعبئة سريعة)</span>
              <select className="admin-input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">اختاري قالباً…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="admin-field">
            <span className="admin-label">الاسم المشترك *</span>
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: باب كلاسيك" />
          </label>
          <label className="admin-field">
            <span className="admin-label">الكود الأساسي *</span>
            <input className="admin-input" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: A5" />
          </label>
          <label className="admin-field">
            <span className="admin-label">النوع</span>
            <input className="admin-input" value={material} onChange={(e) => setMaterial(e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="admin-label">القياسات</span>
            <input className="admin-input" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="مثال: 100 × 210 سم" />
          </label>
          <label className="admin-field sm:col-span-2">
            <span className="admin-label">أين يمكن استخدامه</span>
            <input className="admin-input" value={usage} onChange={(e) => setUsage(e.target.value)} />
          </label>
        </div>
        <label className="admin-field">
          <span className="admin-label">المواصفات المشتركة (كل نقطة بسطر)</span>
          <textarea className="admin-input min-h-[88px] py-2.5" value={specs} onChange={(e) => setSpecs(e.target.value)} />
        </label>
      </section>

      <section className="admin-card space-y-3">
        <h3 className="admin-h3">٣ · لون كل باب</h3>
        {items.length === 0 ? (
          <p className="admin-hint">لسه ما اخترتي صور.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it, i) => (
              <div key={it.key} className="space-y-1.5">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 bg-canvas">
                  <img src={it.preview} alt={`صورة ${i + 1}`} className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    disabled={!!saving}
                    aria-label={`إزالة الصورة ${i + 1}`}
                    className="absolute left-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-black/70 text-red-300"
                  >
                    ✕
                  </button>
                </div>
                <input
                  className="admin-input h-10"
                  placeholder="لون الباب"
                  value={it.color}
                  onChange={(e) => setItems((cur) => cur.map((x) => (x.key === it.key ? { ...x, color: e.target.value } : x)))}
                />
                <p className="admin-hint" dir="ltr" style={{ textAlign: "right" }}>
                  {base}-{i + 1}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-bar">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={!!saving}>
          {saving ?? `حفظ الكل${items.length ? ` (${items.length})` : ""}`}
        </button>
        <button type="button" className="admin-btn" onClick={onCancel} disabled={!!saving}>
          إلغاء
        </button>
      </div>
    </form>
  );
}
