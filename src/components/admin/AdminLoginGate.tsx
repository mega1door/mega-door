import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

/**
 * يحجب محتوى لوحة الإدارة خلف تسجيل دخول حقيقي عبر Supabase Auth (بريد + كلمة مرور).
 * التحقق يصير بالكامل على سيرفر Supabase - لا توجد أي كلمة مرور مخزَّنة بكود الواجهة.
 * لا يوجد نموذج "إنشاء حساب" عمداً: المستخدم الوحيد المسموح له يُنشأ يدوياً من لوحة
 * تحكم Supabase (Authentication → Users)، وتسجيل الدخول العام معطّل من إعدادات
 * المشروع حتى لا يقدر أي زائر ينشئ حساب لنفسه.
 */
export default function AdminLoginGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError(`تعذّر الدخول: ${signInError.message} (${signInError.status ?? "?"})`);
  }

  // لسا ما تحقّقنا من الجلسة المحفوظة (أول تحميل) - نتجنّب وميض شاشة الدخول قبل ما نتأكد
  if (session === undefined) return null;

  // الحساب الإداري المعتمد الوحيد لإدارة الموقع
  const ADMIN_UID = "4ece01b2-d222-4291-b404-60bff142177f";
  const ADMIN_EMAIL = "hebu.ozen@gmail.com";

  if (session) {
    const isAuthorized =
      session.user.id === ADMIN_UID ||
      session.user.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!isAuthorized) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-surface p-7 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="mb-2 font-display text-xl font-bold text-red-400">حساب غير مخوّل</h1>
            <p className="mb-6 text-sm font-medium leading-relaxed text-slate-300">
              الحساب الحالي ({session.user.email}) لا يمتلك صلاحيات إدارة موقع MEGA DOOR.
            </p>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setSession(null);
              }}
              className="w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 shadow-lg shadow-brand/20"
            >
              تسجيل الخروج والتبديل لحساب الإدارة
            </button>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/20 bg-surface p-7 shadow-2xl">
        <h1 className="mb-2 font-display text-xl sm:text-2xl font-bold text-ink">دخول لوحة الإدارة</h1>
        <p className="mb-6 text-sm font-medium leading-relaxed text-slate-300">
          حساب مخصّص لإدارة ميكا فقط - سجّل دخولك للمتابعة.
        </p>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-200">البريد الإلكتروني</span>
          <input
            type="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/20 bg-canvas px-3.5 py-2.5 text-sm sm:text-base font-medium text-ink placeholder:text-slate-500 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-200">كلمة المرور</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-white/20 bg-canvas px-3.5 py-2.5 text-sm sm:text-base font-medium text-ink placeholder:text-slate-500 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition"
          />
        </label>
        {error && (
          <p className="mt-3.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm font-semibold text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-brand px-5 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60 shadow-lg shadow-brand/20"
        >
          {submitting ? "جارِ التحقق..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
