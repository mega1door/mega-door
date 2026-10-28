import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useModels, addModel, updateModel, deleteModel } from "../lib/modelsStore";
import { useCategories, getCategoryById } from "../lib/categoriesStore";
import { setPageSEO } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import ModelForm, { type ModelFormValues } from "../components/admin/ModelForm";
import CategoryManager from "../components/admin/CategoryManager";
import SpecTemplateManager from "../components/admin/SpecTemplateManager";
import SiteSettingsManager from "../components/admin/SiteSettingsManager";
import AdminLoginGate from "../components/admin/AdminLoginGate";
import { getThumbnailUrl, handleThumbError } from "../lib/imageUrl";
// HeroImageManager (نظام الثماني صور القديم) باقٍ بالكود بدون عرض: الهيرو صار صورة وحدة
// تُدار من SiteSettingsManager.
import BulkModelForm from "../components/admin/BulkModelForm";

type Tab = "models" | "cats" | "specs" | "hero" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "models", label: "الموديلات" },
  { id: "cats", label: "الأقسام" },
  { id: "specs", label: "المواصفات" },
  { id: "hero", label: "الهيرو" },
  { id: "settings", label: "إعدادات الموقع" },
];

type View = { mode: "list" } | { mode: "add" } | { mode: "bulk" } | { mode: "edit"; id: string };

export default function AdminPage() {
  const models = useModels();
  const categories = useCategories();
  const [view, setView] = useState<View>({ mode: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("models");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visibleModels = models.filter(
    (m) =>
      (catFilter === "all" || m.category === catFilter) &&
      (!q || [m.modelNumber, m.name, m.color ?? "", m.material ?? ""].join(" ").toLowerCase().includes(q))
  );

  function openTab(t: Tab) {
    setTab(t);
    setView({ mode: "list" });
    setNotice(null);
  }

  useEffect(() => {
    setPageSEO({
      title: "لوحة الإدارة | ميكا للأبواب",
      description: "لوحة إدارة داخلية لإضافة وتعديل موديلات أبواب ميكا.",
      path: "/admin",
    });
  }, []);

  const editingModel = view.mode === "edit" ? models.find((m) => m.id === view.id) : undefined;

  async function handleAdd(values: ModelFormValues) {
    await addModel(values);
    setView({ mode: "list" });
  }

  async function handleEdit(values: ModelFormValues) {
    if (view.mode === "edit") {
      await updateModel(view.id, values);
      setView({ mode: "list" });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`متأكد تريد حذف "${name}"؟ لا يمكن التراجع عن هذا.`)) return;
    setDeletingId(id);
    try {
      await deleteModel(id);
    } catch (err) {
      console.error(err);
      window.alert("تعذّر حذف الموديل. تأكد من اتصالك بالإنترنت وجرّب مرة أخرى.");
    } finally {
      setDeletingId(null);
    }
  }

  const title =
    tab === "models" && view.mode === "bulk"
      ? "إضافة موديلات"
      : tab === "models" && view.mode === "add"
        ? "إضافة موديل"
        : tab === "models" && view.mode === "edit"
          ? `تعديل: ${editingModel?.name ?? ""}`
          : TABS.find((t) => t.id === tab)!.label;

  return (
    <AdminLoginGate>
      <div className="admin-ui min-h-screen lg:flex">
        {/* ديسكتوب: قائمة جانبية يمين */}
        <aside className="hidden w-[232px] shrink-0 flex-col gap-1 border-l border-[#232c3d] bg-[#121826] px-3.5 py-5 lg:flex">
          <div className="px-2.5 pb-4">
            <p className="text-[17px] font-bold">ميكا</p>
            <p className="text-[13px] text-[#7e889b]">لوحة الإدارة</p>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTab(t.id)}
              className={`flex h-[42px] items-center rounded-lg px-3 text-right text-[15px] transition-colors ${
                tab === t.id ? "bg-[#13294a] text-white" : "text-[#a9b2c3] hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <Link to="/" className="flex h-[42px] items-center rounded-lg px-3 text-[15px] text-[#a9b2c3] hover:bg-white/5">
            عرض الموقع
          </Link>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex h-[42px] items-center rounded-lg px-3 text-right text-[15px] text-[#a9b2c3] hover:bg-white/5"
          >
            تسجيل الخروج
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          {/* موبايل: عنوان + تبويبات أفقية */}
          <div className="border-b border-[#232c3d] lg:hidden">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-[13px] text-[#7e889b]">ميكا — لوحة الإدارة</p>
              <div className="flex gap-3 text-[13px] text-[#a9b2c3]">
                <Link to="/">الموقع</Link>
                <button type="button" onClick={() => supabase.auth.signOut()}>
                  خروج
                </button>
              </div>
            </div>
            <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 py-2.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTab(t.id)}
                  className={`h-9 shrink-0 rounded-full border px-3.5 text-[14px] ${
                    tab === t.id ? "border-[#3d9bff] bg-[#13294a] text-white" : "border-[#232c3d] text-[#a9b2c3]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1100px] px-4 py-5 lg:px-7 lg:py-6">
            {/* العنوان بتبويب الموديلات بس - باقي التبويبات بيها عنوانها داخل البطاقة */}
            {tab === "models" && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1>{title}</h1>
              {tab === "models" && view.mode === "list" && (
                <div className="flex gap-2">
                  <button type="button" className="admin-btn admin-btn-primary" onClick={() => setView({ mode: "bulk" })}>
                    + إضافة موديلات
                  </button>
                  <button type="button" className="admin-btn" onClick={() => setView({ mode: "add" })}>
                    + موديل واحد
                  </button>
                </div>
              )}
            </div>
            )}

            {notice && <p className="admin-ok mb-4">{notice}</p>}

            {tab === "cats" && <CategoryManager models={models} />}
            {tab === "specs" && <SpecTemplateManager />}
            {tab === "hero" && <SiteSettingsManager />}
            {tab === "settings" && (
              <div className="admin-card">
                <p className="text-[#a9b2c3]">ماكو إعدادات إضافية حالياً.</p>
                <p className="admin-hint mt-1">البريد الإلكتروني ينضاف هنا بعد الموافقة على إضافة حقله بقاعدة البيانات.</p>
              </div>
            )}

            {tab === "models" && view.mode === "bulk" && (
              <BulkModelForm
                onCancel={() => setView({ mode: "list" })}
                onDone={(n) => {
                  setView({ mode: "list" });
                  setNotice(`انحفظت ${n} موديلات، كل وحدة بصفحة ورابط خاص.`);
                }}
              />
            )}
            {tab === "models" && view.mode === "list" && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                className="admin-input min-w-[180px] flex-1 lg:max-w-[340px]"
                placeholder="ابحثي بالاسم أو الكود أو اللون"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select className="admin-input w-full sm:w-[220px]" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#232c3d] bg-[#121826]">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="border-b border-[#232c3d] bg-[#182031] text-[13px] text-[#7e889b]">
                  <tr>
                    <th className="px-4 py-3 font-bold">الصورة</th>
                    <th className="px-4 py-3 font-bold">كود الموديل</th>
                    <th className="px-4 py-3 font-bold">الاسم</th>
                    <th className="px-4 py-3 font-bold">القسم</th>
                    <th className="px-4 py-3 font-bold">السعر</th>
                    <th className="px-4 py-3 font-bold">الأكثر طلباً</th>
                    <th className="px-4 py-3 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {visibleModels.map((m) => (
                    <tr key={m.id} className="border-t border-white/10 transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="h-12 w-10 overflow-hidden rounded-md border border-white/20 bg-canvas">
                          {m.images[0] && (
                            <img
                              src={getThumbnailUrl(m.images[0])}
                              alt=""
                              onError={(e) => handleThumbError(e, m.images[0])}
                              className="h-full w-full object-contain"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm sm:text-base font-semibold text-ink">{m.modelNumber}</td>
                      <td className="px-4 py-3 text-sm sm:text-base font-semibold text-ink">{m.name}</td>
                      <td className="px-4 py-3 text-sm sm:text-base font-semibold text-slate-200">
                        {getCategoryById(categories, m.category)?.label ?? m.category}
                      </td>
                      <td className="px-4 py-3 text-sm sm:text-base font-semibold text-slate-300">
                        {m.price != null ? m.price.toLocaleString("ar-IQ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {m.isPopular ? (
                          <span className="rounded-full border border-brand/30 bg-brand/20 px-2.5 py-1 text-xs sm:text-sm font-bold text-brand-dark">
                            نعم
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => setView({ mode: "edit", id: m.id })}
                            className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-ink transition hover:border-brand hover:text-brand hover:bg-brand/10"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id, m.name)}
                            disabled={deletingId === m.id}
                            className="rounded-full border border-red-500/40 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-red-300 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleModels.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm sm:text-base font-semibold text-slate-200">
                        {models.length === 0 ? "لا توجد موديلات بعد." : "ماكو نتائج."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "models" && view.mode === "add" && (
          <div className="admin-card">
            <ModelForm onSubmit={handleAdd} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}

        {tab === "models" && view.mode === "edit" && editingModel && (
          <div className="admin-card">
            <ModelForm initial={editingModel} onSubmit={handleEdit} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}
          </div>
        </div>
      </div>
    </AdminLoginGate>
  );
}
