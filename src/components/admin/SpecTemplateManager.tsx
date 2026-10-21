import { useState, type FormEvent } from "react";
import {
  useSpecTemplates,
  addSpecTemplate,
  updateSpecTemplate,
  deleteSpecTemplate,
  type SpecTemplateInput,
} from "../../lib/specTemplatesStore";

type View = { mode: "list" } | { mode: "add" } | { mode: "edit"; id: string };

const emptyForm: SpecTemplateInput = { name: "", material: "", usage: "", specs: [] };

/**
 * إدارة "قوالب المواصفات" من لوحة الإدارة - كل قالب يُعبّى مرة وحدة (نوع/خامة، أين
 * يُستخدم، نقاط مواصفات)، وبعدين يُختار عند إضافة موديل جديد بنموذج الموديل
 * (ModelForm) فيملأ نفس الحقول تلقائياً بدل إعادة كتابتها من الصفر كل مرة.
 */
export default function SpecTemplateManager() {
  const templates = useSpecTemplates();
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<SpecTemplateInput>(emptyForm);
  const [specsText, setSpecsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startAdd() {
    setForm(emptyForm);
    setSpecsText("");
    setError(null);
    setView({ mode: "add" });
  }

  function startEdit(id: string) {
    const t = templates.find((tpl) => tpl.id === id);
    if (!t) return;
    setForm({ name: t.name, material: t.material ?? "", usage: t.usage ?? "", specs: t.specs ?? [] });
    setSpecsText((t.specs ?? []).join("\n"));
    setError(null);
    setView({ mode: "edit", id });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("اسم القالب مطلوب.");
      return;
    }
    const specs = specsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: SpecTemplateInput = { ...form, name: form.name.trim(), specs };
    setError(null);
    setSaving(true);
    try {
      if (view.mode === "add") {
        await addSpecTemplate(payload);
      } else if (view.mode === "edit") {
        await updateSpecTemplate(view.id, payload);
      }
      setView({ mode: "list" });
    } catch (err) {
      console.error(err);
      setError("تعذّر حفظ القالب. تأكد من اتصالك بالإنترنت وجرّب مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`متأكد تريد حذف قالب "${name}"؟ (الموديلات اللي استخدمته سابقاً ما راح تتأثر)`)) return;
    setDeletingId(id);
    try {
      await deleteSpecTemplate(id);
    } catch (err) {
      console.error(err);
      window.alert("تعذّر حذف القالب. تأكد من اتصالك بالإنترنت وجرّب مرة أخرى.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/20 bg-canvas px-3.5 py-2.5 text-sm sm:text-base font-medium text-ink placeholder:text-slate-500 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-200";

  return (
    <div className="mb-6 rounded-xl border border-white/20 bg-surface p-5 sm:p-6 shadow-lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">قوالب المواصفات</h2>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-300">
            قالب تعبّيه مرة وحدة (النوع، أين يُستخدم، نقاط المواصفات) وتختاره بعدين عند
            إضافة أي موديل جديد يشترك بنفس المواصفات، فتتعبى الحقول تلقائياً وتقدر تعدّلها.
          </p>
        </div>
        {view.mode === "list" && (
          <button
            type="button"
            onClick={startAdd}
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 shadow-md shadow-brand/20"
          >
            + إضافة قالب جديد
          </button>
        )}
      </div>

      {view.mode === "list" && (
        <ul className="divide-y divide-white/10">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-base font-bold text-ink">{t.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">
                  {t.material || "بدون نوع محدد"}
                  {t.usage ? ` · ${t.usage}` : ""}
                  {t.specs && t.specs.length > 0 ? ` · ${t.specs.length} نقطة مواصفات` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <button
                  type="button"
                  onClick={() => startEdit(t.id)}
                  className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-ink transition hover:border-brand hover:text-brand hover:bg-brand/10"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={deletingId === t.id}
                  className="rounded-full border border-red-500/40 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-red-300 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
          {templates.length === 0 && (
            <li className="py-6 text-center text-sm font-medium leading-relaxed text-slate-400">
              لا توجد قوالب بعد - أضيفي قالب أول مرة تضيفين فيها موديل جديد لتسريع باقي الموديلات المشابهة.
            </li>
          )}
        </ul>
      )}

      {(view.mode === "add" || view.mode === "edit") && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3.5 py-2.5 text-sm font-semibold text-red-300">{error}</p>
          )}
          <div>
            <label className={labelClass}>اسم القالب *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: باب داخلي قياسي"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>النوع / الخامة</label>
              <input
                className={inputClass}
                value={form.material}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                placeholder="مثال: خشب HDF مطلي"
              />
            </div>
            <div>
              <label className={labelClass}>أين يمكن استخدامه</label>
              <input
                className={inputClass}
                value={form.usage}
                onChange={(e) => setForm((f) => ({ ...f, usage: e.target.value }))}
                placeholder="مثال: غرف النوم والمكاتب"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>المواصفات (كل نقطة بسطر منفصل)</label>
            <textarea
              className={inputClass}
              rows={4}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder={"طلاء PU مقاوم للخدش والرطوبة\nعزل صوتي جيد"}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60 shadow-md shadow-brand/20"
            >
              {saving ? "...جارِ الحفظ" : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setView({ mode: "list" })}
              className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:text-brand hover:bg-brand/10"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
