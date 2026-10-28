import { useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminAccess, refreshAdminAccess } from "../../lib/adminAccess";
import { registerAdminCandidate, requestAdminPasswordReset, signOutAdmin } from "../../lib/adminAuth";
import DeleteOwnAccount from "./DeleteOwnAccount";

function AuthShell({ children }: { children: ReactNode }) {
  return <main dir="rtl" className="min-h-[100svh] bg-charcoal-deep px-5 py-6 font-body text-ink sm:px-8 lg:grid lg:place-items-center lg:py-12">
    <div className="mx-auto w-full max-w-[1000px]">
      <a href={import.meta.env.BASE_URL} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-silver-light transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mega-pure-blue)] lg:mb-8">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7M16 12H3" /></svg>
        العودة إلى الموقع
      </a>
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-charcoal-card shadow-[0_28px_90px_rgba(0,0,0,0.25)] lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <section aria-label="MEGA DOOR" className="border-b border-white/10 px-7 py-7 text-center sm:px-10 lg:flex lg:flex-col lg:items-start lg:justify-between lg:border-b-0 lg:border-l lg:px-12 lg:py-12 lg:text-right">
          <img src={`${import.meta.env.BASE_URL}images/brand/mega-door-logo.png`} alt="شعار MEGA DOOR الرسمي" width={480} height={480} className="mx-auto h-24 w-24 object-contain sm:h-28 sm:w-28 lg:mx-0 lg:h-40 lg:w-40" />
        </section>
        <section className="bg-charcoal px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">{children}</section>
      </div>
    </div>
  </main>;
}

/** Supabase Auth supplies identity; the same server role RPC used by RLS supplies authorization. */
export default function AdminLoginGate({ children }: { children: ReactNode }) {
  const access = useAdminAccess();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputClass = "h-12 w-full rounded-xl border border-white/15 bg-charcoal-deep px-4 text-base font-medium text-ink placeholder:text-silver-dark transition focus:border-[var(--mega-pure-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--mega-pure-blue)]/20 disabled:opacity-50";
  const primaryClass = "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[var(--mega-royal-blue)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--mega-pure-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mega-pure-blue)] disabled:cursor-wait disabled:opacity-50";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null); setMessage(null);
    if (mode === "register" && (password.length < 8 || password !== confirm)) {
      setError("اختاري كلمة مرور من 8 أحرف على الأقل وأعيدي كتابتها بشكل مطابق."); return;
    }
    setSubmitting(true);
    try {
      if (mode === "register") {
        await registerAdminCandidate(email, password);
        setPassword(""); setConfirm("");
        setMessage("راجعي بريدك لرسالة التفعيل. تأكيد البريد لا يمنح الإدارة؛ يبقى الحساب بانتظار موافقة صاحب الموقع.");
      } else if (mode === "reset") {
        await requestAdminPasswordReset(email);
        setMessage("إذا كان البريد مسجلاً، ستصلك رسالة لاستعادة كلمة مرور حسابك.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        setPassword("");
      }
    } catch { setError("تعذّر إكمال الطلب. تحققي من البيانات والاتصال وحاولي مجدداً."); }
    finally { setSubmitting(false); }
  }

  if (access.status === "authorized") return <>{children}</>;
  if (access.status === "loading") return <AuthShell><div className="flex min-h-60 items-center justify-center gap-3 text-sm text-silver-light" role="status"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--mega-pure-blue)]" />جارِ التحقق من الحساب…</div></AuthShell>;
  if (access.user || access.status === "error") return (
    <AuthShell>
      <h1 className="font-body text-2xl font-bold leading-snug">{access.status === "error" ? "تعذّر التحقق من الصلاحيات" : "حسابك بانتظار الاعتماد"}</h1>
      <p className="mb-8 mt-4 text-sm leading-7 text-silver-light">
        {access.status === "error" ? "لم نتمكن من التحقق من صلاحيات حسابك. أعيدي المحاولة." : `الحساب ${access.user?.email || ""} لا يملك صلاحية الإدارة. أكّدي بريدك ثم انتظري موافقة صاحب الموقع.`}
      </p>
      <button type="button" className={primaryClass} onClick={() => { void refreshAdminAccess(); }}>إعادة التحقق</button>
      <button type="button" className="mt-4 min-h-11 w-full rounded-xl text-sm text-silver-light transition hover:text-white" onClick={() => { void signOutAdmin().catch(() => setError("تعذّر تسجيل الخروج. حاولي مجدداً.")); }}>تسجيل الخروج</button>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm leading-6 text-red-300">{error}</p>}
      <DeleteOwnAccount />
    </AuthShell>
  );
  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="w-full">
        <h1 className="mb-8 font-body text-2xl font-bold leading-snug sm:text-[28px]">{mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب" : "استعادة كلمة المرور"}</h1>
        <label className="mb-5 block">
          <span className="mb-2.5 block text-sm font-medium text-ink">البريد الإلكتروني</span>
          <input type="email" dir="ltr" autoComplete="email" autoFocus required disabled={submitting} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={inputClass} />
        </label>
        {mode !== "reset" && <div className="mb-5">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <label htmlFor="admin-password" className="text-sm font-medium text-ink">كلمة المرور</label>
            {mode === "login" && <button type="button" disabled={submitting} className="min-h-8 text-xs text-silver-light underline-offset-4 transition hover:text-white hover:underline" onClick={() => { setMode("reset"); setError(null); setMessage(null); setPassword(""); setConfirm(""); }}>نسيت كلمة المرور</button>}
          </div>
          <input id="admin-password" type="password" dir="ltr" autoComplete={mode === "register" ? "new-password" : "current-password"} required disabled={submitting} minLength={mode === "register" ? 8 : undefined} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" className={inputClass} />
        </div>}
        {mode === "register" && <label className="mb-5 block">
          <span className="mb-2.5 block text-sm font-medium text-ink">تأكيد كلمة المرور</span>
          <input type="password" dir="ltr" autoComplete="new-password" required disabled={submitting} minLength={8} value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="••••••••" className={inputClass} />
        </label>}
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm leading-6 text-red-300">{error}</p>}
        {message && <p role="status" className="mb-5 rounded-xl border border-white/15 bg-white/5 p-3 text-sm leading-7 text-silver-light">{message}</p>}
        <button type="submit" disabled={submitting} className={`${primaryClass} mt-7`}>
          <span>{submitting ? "جارِ الإرسال…" : mode === "login" ? "تسجيل الدخول" : mode === "register" ? "تسجيل وإرسال رسالة التفعيل" : "إرسال رابط الاستعادة"}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="m14 6-6 6 6 6M8 12h13" /></svg>
        </button>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-5 text-sm">
          {([['login','تسجيل الدخول'],['register','إنشاء حساب'],['reset','نسيت كلمة المرور']] as const).filter(([value]) => value !== mode && !(mode === "login" && value === "reset")).map(([value,label]) =>
            <button key={value} type="button" disabled={submitting} className="min-h-10 font-medium text-ink underline decoration-[var(--mega-pure-blue)] decoration-2 underline-offset-[6px] transition hover:text-white" onClick={() => { setMode(value); setError(null); setMessage(null); setPassword(""); setConfirm(""); }}>{label}</button>)}
        </div>
      </form>
    </AuthShell>
  );
}
