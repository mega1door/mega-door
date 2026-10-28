import { useState } from "react";
import { useAdminAccess } from "../../lib/adminAccess";
import { deleteOwnAccount } from "../../lib/adminAuth";

export default function DeleteOwnAccount() {
  const access = useAdminAccess();
  const [open, setOpen] = useState(false), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  if (!access.user || access.role === "owner" || !["pending", "authorized"].includes(access.status)) return null;
  async function remove() {
    if (busy || confirmation !== "حذف حسابي" || !password) return;
    setBusy(true); setError(null);
    try { await deleteOwnAccount(password, confirmation); }
    catch { setError("تعذّر حذف الحساب. تحققي من كلمة المرور وحاولي مجدداً."); }
    finally { setBusy(false); setPassword(""); }
  }
  return <section className="mt-6 border-t border-white/10 pt-5">
    {!open ? <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm text-red-300">حذف حسابي</button> : <div className="space-y-3">
      <p className="text-sm leading-6 text-silver-light">تُحذف بيانات الدخول وتُلغى صلاحيتك. موديلات الموقع وصوره تبقى محفوظة.</p>
      <label className="block text-sm">كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-canvas p-3" disabled={busy} /></label>
      <label className="block text-sm">اكتبي «حذف حسابي» للتأكيد<input type="text" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-canvas p-3" disabled={busy} /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={() => { void remove(); }} disabled={busy || !password || confirmation !== "حذف حسابي"} className="min-h-11 rounded-lg border border-red-300/50 px-4 text-sm text-red-300 disabled:opacity-40">{busy ? "جارِ الحذف…" : "تأكيد حذف حسابي"}</button>
        <button type="button" disabled={busy} onClick={() => { setOpen(false); setPassword(""); setConfirmation(""); setError(null); }} className="min-h-11 px-4 text-sm">إلغاء</button></div>
    </div>}
  </section>;
}
