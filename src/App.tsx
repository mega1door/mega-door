import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import CategoryListPage from "./pages/CategoryListPage";
import PopularPage from "./pages/PopularPage";
import ModelDetailPage from "./pages/ModelDetailPage";
import SearchPage from "./pages/SearchPage";
import NotFoundPage from "./pages/NotFoundPage";
import FaqPage from "./pages/FaqPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { trackPageView } from "./lib/metaPixel";
import { supabase } from "./lib/supabaseClient";

// Administration is loaded only when requested; public visitors need no account-management code.
const AdminPage = lazy(() => import("./pages/AdminPage"));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // تتبع PageView عند كل تغيير مسار (Meta Pixel)
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  // رابط "استعادة كلمة المرور" من Supabase قد يرجّع المستخدم لأي مسار (حسب إعداد
  // Site URL بالمشروع) وليس بالضرورة /reset-password مباشرة. عميل Supabase يقرأ
  // رمز الاسترجاع من الرابط تلقائياً عند تحميل التطبيق ويطلق حدث PASSWORD_RECOVERY -
  // نستمع له هنا بمستوى التطبيق كامل لضمان توجيه المستخدم لصفحة تعيين كلمة المرور
  // بغض النظر عن الصفحة اللي فتحها الرابط فعلياً.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  return (
    <Routes>
      {/* لوحة الإدارة منشورة الآن مع الموقع العام - محمية بتسجيل دخول حقيقي عبر
          Supabase Auth (انظر AdminLoginGate.tsx)، يتحقق منه سيرفر Supabase نفسه،
          وليس بكلمة مرور مخزَّنة بكود الواجهة. */}
      <Route path="admin" element={<Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-canvas" role="status">جارِ تحميل لوحة الإدارة…</div>}><AdminPage /></Suspense>} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="popular" element={<PopularPage />} />
        <Route path="model/:id" element={<ModelDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="faq" element={<FaqPage />} />
        {/* مسار ديناميكي لأي قسم مُدار من لوحة الإدارة (وليس فقط الأقسام الثلاثة الافتراضية:
            /interior و /exterior و /partitions تستمر تعمل لأن معرّفاتها تبقى نفسها) */}
        <Route path=":categorySlug" element={<CategoryListPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
