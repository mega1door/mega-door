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
import HeroImageManager from "../components/admin/HeroImageManager";

type View = { mode: "list" } | { mode: "add" } | { mode: "edit"; id: string };

export default function AdminPage() {
  const models = useModels();
  const categories = useCategories();
  const [view, setView] = useState<View>({ mode: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <AdminLoginGate>
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">لوحة إدارة الموديلات</h1>
              <p className="mt-2 text-sm sm:text-base font-semibold leading-relaxed text-slate-200">
                إضافة وتعديل وحذف موديلات الأبواب، ورفع وترتيب الصور، وتحديد الأكثر طلباً.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <Link to="/" className="text-sm sm:text-base font-semibold text-slate-200 transition hover:text-brand">
                الرجوع للموقع
              </Link>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="text-sm sm:text-base font-semibold text-slate-300 transition hover:text-red-300"
              >
                تسجيل خروج
              </button>
            </div>
          </div>

        {view.mode === "list" && (
          <>
            <SiteSettingsManager />
            <CategoryManager models={models} />
            <SpecTemplateManager />
            <HeroImageManager />

            <div className="mb-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setView({ mode: "add" })}
                className="rounded-full bg-brand px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg shadow-brand/20"
              >
                + إضافة موديل جديد
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/20 bg-surface/60 shadow-xl">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="border-b border-white/20 bg-surface text-xs sm:text-sm font-bold text-slate-200">
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
                  {models.map((m) => (
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
                  {models.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm sm:text-base font-semibold text-slate-200">
                        لا توجد موديلات بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view.mode === "add" && (
          <div className="rounded-xl border border-white/20 bg-surface p-6 sm:p-8 shadow-2xl">
            <h2 className="mb-6 font-display text-xl sm:text-2xl font-bold text-ink">إضافة موديل جديد</h2>
            <ModelForm onSubmit={handleAdd} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}

        {view.mode === "edit" && editingModel && (
          <div className="rounded-xl border border-white/20 bg-surface p-6 sm:p-8 shadow-2xl">
            <h2 className="mb-6 font-display text-xl sm:text-2xl font-bold text-ink">تعديل: {editingModel.name}</h2>
            <ModelForm initial={editingModel} onSubmit={handleEdit} onCancel={() => setView({ mode: "list" })} />
          </div>
        )}
        </div>
      </div>
    </AdminLoginGate>
  );
}
