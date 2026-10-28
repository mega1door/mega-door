import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageSEO } from "../lib/seo";

export default function NotFoundPage() {
  useEffect(() => {
    setPageSEO({ title: "الصفحة غير موجودة | ميكا للأبواب", description: "الصفحة المطلوبة غير متوفرة.", noindex: true });
  }, []);

  return (
    <div className="mx-auto max-w-content px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink">404 - الصفحة غير موجودة</h1>
      <p className="mt-3 text-muted">الصفحة التي تبحث عنها غير متوفرة.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-canvas">
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
