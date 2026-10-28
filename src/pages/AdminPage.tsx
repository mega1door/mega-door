import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useModels, addModel, updateModel, deleteModel } from "../lib/modelsStore";
import { useCategories, getCategoryById } from "../lib/categoriesStore";
import { setPageSEO } from "../lib/seo";
import { supabase } from "../lib/supabaseClient";
import ModelForm, { type ModelFormValues } from "../components/admin/ModelForm";
import CategoryManager from "../components/admin/CategoryManager";
import SpecTemplateManager from "../components/admin/SpecTemplateManager";
import AdminLoginGate from "../components/admin/AdminLoginGate";
import { getThumbnailUrl, handleThumbError } from "../lib/imageUrl";
// HeroImageManager (نظام الثماني صور القديم) باقٍ بالكود بدون عرض: الهيرو صار صورة وحدة
// تُدار من SiteSettingsManager.
import BulkModelForm from "../components/admin/BulkModelForm";
import HeroModelsManager from "../components/admin/HeroModelsManager";
import HeroFallbackManager from "../components/admin/HeroFallbackManager";

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
  const [navOpen, setNavOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const visibleModels = models.filter(
    (m) =>
      (catFilter === "all" || m.category === catFilter) &&
      (!q || [m.modelNumber, m.name, m.color ?? "", m.material ?? ""].join(" ").toLowerCase().includes(q))
  );

  function openTab(t: Tab) {
    setNavOpen(false);
    setTab(t);
    setView({ mode: "list" });
    setNotice(null);
  }

  // وزن 500 من Tajawal (غير محمّل بالموقع العام) - يُحمَّل داخل لوحة الإدارة فقط
  useEffect(() => {
    const id = "admin-font-500";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700&display=swap";
    document.head.appendChild(link);
  }, []);

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
        {/* شريط علوي للشاشات الصغيرة فقط: زر القائمة + اسم القسم الحالي */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#232c3d] bg-[#121826] px-4 py-2.5 lg:hidden">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            القائمة
          </button>
          <p className="admin-nav-title">{TABS.find((t) => t.id === tab)!.label}</p>
        </div>

        {navOpen && (
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* نفس القائمة بالشاشتين: ثابتة يمين بالديسكتوب، وتنفتح من اليمين بالموبايل */}
        <aside
          id="admin-nav"
          className={`fixed inset-y-0 right-0 z-50 flex w-[264px] flex-col gap-1 border-l border-[#232c3d] bg-[#121826] px-3.5 py-5 transition-transform duration-200 lg:static lg:z-auto lg:w-[240px] lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between px-2.5 pb-4">
            <div>
              <p className="admin-brand">ميكا</p>
              <p className="admin-hint">لوحة الإدارة</p>
            </div>
            <button type="button" className="admin-btn admin-btn-sm lg:hidden" onClick={() => setNavOpen(false)} aria-label="إغلاق القائمة">
              ✕
            </button>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTab(t.id)}
              className={`admin-nav-item ${tab === t.id ? "is-active" : ""}`}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <Link to="/" className="admin-nav-item">
            عرض الموقع
          </Link>
          <button type="button" onClick={() => supabase.auth.signOut()} className="admin-nav-item">
            تسجيل الخروج
          </button>
        </aside>

        <div className="min-w-0 flex-1">
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
            {tab === "hero" && (
              <>
                <HeroModelsManager />
                <HeroFallbackManager />
              </>
            )}
            {tab === "settings" && (
              <div className="admin-card">
                <p>ماكو إعدادات إضافية حالياً.</p>
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
              <select className="admin-input w-full sm:w-[240px]" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {/* قائمة واحدة متجاوبة: صف جدول بالديسكتوب، وبطاقة مرتبة بالموبايل - نفس العناصر */}
            <div className="overflow-hidden rounded-xl border border-[#232c3d] bg-[#121826]">
              <div className="admin-mrow admin-mhead hidden lg:grid" aria-hidden="true">
                <span>الصورة</span>
                <span>الكود</span>
                <span>الاسم</span>
                <span>القسم</span>
                <span>السعر</span>
                <span>الأكثر طلباً</span>
                <span />
              </div>
              {visibleModels.map((m) => (
                <div key={m.id} className="admin-mrow">
                  <div className="admin-mthumb">
                    {m.images[0] && (
                      <img
                        src={getThumbnailUrl(m.images[0])}
                        alt=""
                        onError={(e) => handleThumbError(e, m.images[0])}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0 lg:contents">
                    <span className="admin-mcode" dir="ltr">
                      {m.modelNumber}
                    </span>
                    <span className="admin-mname">{m.name}</span>
                    <span className="admin-mmeta">
                      {getCategoryById(categories, m.category)?.label ?? m.category}
                      {m.color ? <span className="lg:hidden"> · {m.color}</span> : null}
                    </span>
                    <span className="admin-mmeta hidden lg:block">{m.price != null ? m.price.toLocaleString("ar-IQ") : "—"}</span>
                    <span className="hidden lg:block">
                      {m.isPopular ? <span className="admin-pill">نعم</span> : <span className="admin-mmeta">—</span>}
                    </span>
                  </div>
                  <div className="admin-mactions">
                    <button type="button" onClick={() => setView({ mode: "edit", id: m.id })} className="admin-btn admin-btn-sm">
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.name)}
                      disabled={deletingId === m.id}
                      className="admin-btn admin-btn-sm admin-btn-danger"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {visibleModels.length === 0 && (
                <p className="px-4 py-10 text-center">{models.length === 0 ? "لا توجد موديلات بعد." : "ماكو نتائج."}</p>
              )}
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
