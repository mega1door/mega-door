import { useRef, type ReactNode } from "react";
import { useModelsStatus, refreshModels } from "../lib/modelsStore";
import { useCategoriesStatus, refreshCategories } from "../lib/categoriesStore";

/** Keeps the existing page design; only renders pending/error content before real data. */
export default function CatalogBoundary({ children }: { children: ReactNode }) {
  const hasLoaded = useRef(false);
  const models = useModelsStatus();
  const categories = useCategoriesStatus();
  if (models === "ready" && categories === "ready") hasLoaded.current = true;
  // Keep forms mounted during refreshes after saves (including bulk imports).
  if (hasLoaded.current) return <>{children}</>;
  const failed = models === "error" || categories === "error";
  return (
    <div className="mx-auto max-w-content px-4 py-20 text-center sm:px-6" role={failed ? "alert" : "status"} aria-busy={!failed}>
      <p className="text-sm text-muted">{failed ? "تعذّر تحميل الكتالوج. تحقق من اتصالك وحاول مرة أخرى." : "جاري تحميل الموديلات…"}</p>
      {failed && <button className="mt-4 text-brand underline" onClick={() => {
        if (models === "error") void refreshModels();
        if (categories === "error") void refreshCategories();
      }}>إعادة المحاولة</button>}
    </div>
  );
}
