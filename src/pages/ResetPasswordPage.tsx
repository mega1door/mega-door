import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * صفحة تعيين كلمة مرور جديدة - الوجهة اللي يوصلها المستخدم من رابط "Reset Password"
 * اللي يرسله Supabase بالإيميل. عميل Supabase يقرأ تلقائياً رمز الاسترجاع من رابط
 * الإيميل (بالـ hash أو query) عند تحميل التطبيق ويُنشئ جلسة مؤقتة صالحة فقط لتحديث
 * كلمة المرور (انظر أيضاً المستمع العام بـ App.tsx اللي يحوّل المستخدم لهذي الصفحة
 * حتى لو الرابط رجّعه للصفحة الرئيسية بدل هذي الصفحة مباشرة).
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionReady(!!data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSessionReady(!!newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(`تعذّر تحديث كلمة المرور: ${updateError.message}`);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/admin", { replace: true }), 1500);
  }

  const cardClass = "w-full max-w-sm rounded-2xl border border-border bg-surface p-6";
  const inputClass =
    "w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none";

  // لسا نتحقق من وجود جلسة استرجاع صالحة
  if (sessionReady === null) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas" />;
  }

  // ما فيه جلسة استرجاع صالحة - الرابط غير صحيح أو منتهي الصلاحية
  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className={cardClass}>
          <h1 className="mb-1 font-display text-lg font-extrabold text-ink">رابط غير صالح</h1>
          <p className="text-sm text-muted">
            رابط إعادة تعيين كلمة المرور منتهي الصلاحية أو غير صحيح. اطلبي رابطاً جديداً من صفحة تسجيل الدخول.
          </p>
          <Link to="/admin" className="mt-3 inline-block text-sm text-ink underline">طلب رابط جديد</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className={cardClass}>
          <h1 className="mb-1 font-display text-lg font-extrabold text-ink">تم بنجاح</h1>
          <p className="text-sm text-muted">تحديث كلمة المرور تم بنجاح، جاري تحويلك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className={cardClass}>
        <h1 className="mb-1 font-display text-lg font-extrabold text-ink">تعيين كلمة مرور جديدة</h1>
        <p className="mb-5 text-sm text-muted">اختر كلمة مرور جديدة لحساب إدارة ميكا.</p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold text-muted">كلمة المرور الجديدة</span>
          <input
            type="password"
            autoFocus
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted">تأكيد كلمة المرور</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "جارِ الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </form>
    </div>
  );
}
