import { Link } from "react-router-dom";
import ContactAccordions from "./ContactAccordions";

/**
 * فوتر مختصر: «التواصل» و«عنوان المعرض» (نفس خيارات قائمة الهمبرغر)، رابط الأسئلة
 * الشائعة، أيقونتا فيسبوك وإنستغرام (يمين)، وسطر الحقوق بالمنتصف.
 * زر واتساب العائم يبقى خارج الفوتر (Layout).
 */
const iconLinkClass =
  "flex h-10 w-10 items-center justify-center rounded-full text-ink/80 transition-colors duration-200 hover:text-bronze-light lg:hover:text-brand-dark";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-canvas lg:mt-12">
      <div className="mx-auto max-w-content px-1 pt-2 text-right sm:px-3">
        <div className="flex flex-col gap-1 lg:max-w-[480px]">
          <ContactAccordions source="footer" />
        </div>
      </div>
      <div className="mx-auto flex max-w-content flex-col items-start gap-1 px-4 pt-1 text-right sm:px-6">
        <Link
          to="/faq"
          className="py-1.5 text-sm font-semibold text-ink/80 transition-colors duration-200 hover:text-bronze-light lg:hover:text-brand-dark"
        >
          الأسئلة الشائعة
        </Link>
        <div className="-mr-2.5 flex items-center gap-1">
          <a
            href="https://www.facebook.com/share/1ccgPNjftp/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ميكا للأبواب على فيسبوك"
            className={iconLinkClass}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/mega_door?stkn=MXgxMm96NXE1anExaQ%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ميكا للأبواب على إنستغرام"
            className={iconLinkClass}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[22px] w-[22px]" aria-hidden="true">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
              <circle cx="12" cy="12" r="4.3" />
              <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </div>
      <p className="whitespace-nowrap px-4 pb-3 pt-1 text-center text-[11.5px] text-muted/80">
        © {new Date().getFullYear()} MEGA DOOR – جميع الحقوق محفوظة
      </p>
    </footer>
  );
}
