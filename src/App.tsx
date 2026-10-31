import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
const CategoryListPage = lazy(() => import("./pages/CategoryListPage"));
const PopularPage = lazy(() => import("./pages/PopularPage"));
const ModelDetailPage = lazy(() => import("./pages/ModelDetailPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
import { trackPageView } from "./lib/metaPixel";
import { isSupabaseAuthCallback } from "./lib/authCallback";

// Administration is loaded only when requested; public visitors need no account-management code.
const AdminPage = lazy(() => import("./pages/AdminPage"));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasAuthCallback = isSupabaseAuthCallback(location);

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
    if (!hasAuthCallback) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import("./lib/supabaseClient").then(({ supabase }) => {
      if (!active) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          navigate("/reset-password", { replace: true });
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch((error: unknown) => console.error("تعذّر تهيئة استعادة كلمة المرور.", error));
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [hasAuthCallback, navigate]);

  return (
    <Routes>
      {/* لوحة الإدارة منشورة الآن مع الموقع العام - محمية بتسجيل دخول حقيقي عبر
          Supabase Auth (انظر AdminLoginGate.tsx)، يتحقق منه سيرفر Supabase نفسه،
          وليس بكلمة مرور مخزَّنة بكود الواجهة. */}
      <Route path="admin" element={<Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-canvas" role="status">جارِ تحميل لوحة الإدارة…</div>}><AdminPage /></Suspense>} />
      <Route path="reset-password" element={<Suspense fallback={<RouteLoading />}><ResetPasswordPage /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="popular" element={<Suspense fallback={<RouteLoading />}><PopularPage /></Suspense>} />
        <Route path="model/:id" element={<Suspense fallback={<RouteLoading />}><ModelDetailPage /></Suspense>} />
        <Route path="search" element={<Suspense fallback={<RouteLoading />}><SearchPage /></Suspense>} />
        <Route path="faq" element={<Suspense fallback={<RouteLoading />}><FaqPage /></Suspense>} />
        {/* مسار ديناميكي لأي قسم مُدار من لوحة الإدارة (وليس فقط الأقسام الثلاثة الافتراضية:
            /interior و /exterior و /partitions تستمر تعمل لأن معرّفاتها تبقى نفسها) */}
        <Route path=":categorySlug" element={<Suspense fallback={<RouteLoading />}><CategoryListPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<RouteLoading />}><NotFoundPage /></Suspense>} />
      </Route>
    </Routes>
  );
}

function RouteLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-muted" role="status">جارِ تحميل الصفحة…</div>;
}
