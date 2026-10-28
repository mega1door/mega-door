import { useEffect, useState } from "react";
import { useAdminAccess } from "../../lib/adminAccess";
import { listAdminAccounts, approveAdmin, revokeAdmin, type AdminAccount } from "../../lib/adminAccounts";

export default function AdminAccountsManager() {
  const { role } = useAdminAccess();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (role !== "owner") return;
    setLoading(true);
    void listAdminAccounts().then(rows => { if (active) { setAccounts(rows); setError(null); } })
      .catch(() => { if (active) setError("تعذّر تحميل الحسابات. أعيدي المحاولة."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role]);
  async function change(account: AdminAccount, approve: boolean) {
    if (busy || role !== "owner" || account.role === "owner") return;
    setBusy(account.user_id); setError(null); setMessage(null);
    try {
      if (approve) await approveAdmin(account.user_id); else await revokeAdmin(account.user_id);
      setAccounts(await listAdminAccounts());
      setMessage(approve ? "تم اعتماد الحساب كأدمن للموقع." : "تم إلغاء صلاحية الإدارة لهذا الحساب.");
    } catch { setError("تعذّر تحديث الصلاحية. تأكدي من تأكيد البريد ثم حاولي مجدداً."); }
    finally { setBusy(null); }
  }
  if (role !== "owner") return <p className="admin-alert">إدارة صلاحيات الحسابات متاحة لصاحب الموقع فقط.</p>;
  return <section className="admin-card space-y-4">
    <h2 className="admin-h3">اعتماد حسابات الإدارة</h2>
    <p className="admin-hint">الحساب الجديد يبقى بلا صلاحية حتى تأكيد البريد وموافقتك. صلاحية الأدمن تخص الموقع فقط.</p>
    {loading && <p role="status">جارِ تحميل الحسابات…</p>}
    {error && <p role="alert" className="admin-alert">{error}</p>}
    {message && <p role="status" className="admin-ok">{message}</p>}
    {accounts.map(account => <div key={account.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
      <div><p dir="ltr">{account.email || account.user_id}</p><p className="admin-hint">{account.role === "owner" ? "صاحب الموقع — محفوظ" : account.role === "admin" ? "أدمن معتمد" : account.confirmed ? "بانتظار موافقتك" : "البريد غير مؤكّد"}</p></div>
      {account.role !== "owner" && <button type="button" className="admin-btn" disabled={!!busy || !account.confirmed} onClick={() => { void change(account, account.role !== "admin"); }}>
        {busy === account.user_id ? "جارِ الحفظ…" : account.role === "admin" ? "إلغاء صلاحية الأدمن" : "اعتماد كأدمن"}
      </button>}
    </div>)}
  </section>;
}
