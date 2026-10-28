import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCategories } from "../lib/categoriesStore";
import ContactAccordions from "./ContactAccordions";

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
    isActive
      ? "bg-bronze/15 text-bronze-light lg:bg-brand/15 lg:text-brand"
      : "text-ink/80 hover:bg-white/5 hover:text-ink"
  }`;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const categories = useCategories();

  // همبرغر ثابت أقصى اليمين وشعار ثابت أقصى اليسار بكل القياسات (فون
  // وحاسبة على حد سواء - بطلب صريح). روابط التنقل تظهر فقط داخل القائمة
  // المنسدلة تحت الهيدر عند فتح الهمبرغر، ما فيه نسخة نصية ظاهرة بالهيدر نفسه.
  const navLinks = [
    { to: "/", label: "الرئيسية", end: true },
    ...categories.map((c) => ({ to: `/${c.id}`, label: c.label, end: false })),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-charcoal shadow-[0_1px_14px_rgba(0,0,0,0.28)] lg:border-border lg:bg-surface">
      {/* الموبايل والتابلت (أقل من lg) - حسب التصميم المعتمد: القائمة أقصى اليمين،
          الشعار الأصلي بالمنتصف، البحث أقصى اليسار. بدون واتساب داخل الهيدر. */}
      <div className="grid grid-cols-[44px_1fr_44px] items-center px-3 py-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink transition active:bg-white/5"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <Link to="/" className="justify-self-center" aria-label="ميكا للأبواب - الرئيسية">
          <img
            src={`${import.meta.env.BASE_URL}images/brand/mega-door-logo.png`}
            alt="شعار ميكا للأبواب"
            width={52}
            height={52}
            className="h-[52px] w-[52px] object-contain"
          />
        </Link>

        <Link
          to="/search"
          aria-label="البحث عن موديل"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink transition active:bg-white/5"
        >
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6.5" />
            <path strokeLinecap="round" d="M16 16l4.5 4.5" />
          </svg>
        </Link>
      </div>

      {/* الديسكتوب (lg فأكبر) - بدون أي تغيير عن التصميم الحالي */}
      <div className="mx-auto hidden max-w-content items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:flex">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="فتح القائمة"
          aria-expanded={menuOpen}
          className="rounded-lg border border-border p-2 text-ink transition hover:border-brand hover:text-brand"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-1.5" aria-label="ميكا للأبواب - الرئيسية">
          <span className="hidden font-display text-sm font-extrabold tracking-tight text-ink sm:inline">
            MEGA DOOR
          </span>
          <img
            src={`${import.meta.env.BASE_URL}images/brand/mega-door-logo.png`}
            alt="شعار ميكا للأبواب"
            className="h-10 w-10 object-contain"
          />
        </Link>
      </div>

      {/* قائمة الهمبرغر - نفس السلوك بكل القياسات */}
      {menuOpen && (
        <div className="border-t border-white/[0.06] bg-charcoal px-4 py-3 sm:px-6 lg:border-border lg:bg-surface">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* التواصل وعنوان المعرض: مخفية لحد ما ينضغط الخيار */}
          <div className="mt-2 flex flex-col gap-1 border-t border-white/[0.06] pt-2 text-right lg:border-border">
            <ContactAccordions source="menu" />
          </div>
        </div>
      )}
    </header>
  );
}
