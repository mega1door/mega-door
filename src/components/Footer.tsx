import { Link } from "react-router-dom";
import { useCategories } from "../lib/categoriesStore";
import { buildGeneralWhatsAppLink } from "../lib/whatsapp";
import { trackContact } from "../lib/metaPixel";

export default function Footer() {
  const categories = useCategories();
  const quickLinks = [
    { to: "/", label: "الرئيسية" },
    ...categories.map((c) => ({ to: `/${c.id}`, label: c.label })),
  ];

  return (
    <footer className="mt-24 border-t border-border bg-canvas">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-14 text-right sm:px-6 sm:grid-cols-2">
        {/* روابط سريعة - نفس أقسام الهيدر */}
        <div>
          <p className="mb-3 text-sm font-bold text-ink">روابط سريعة</p>
          <ul className="flex flex-col gap-2.5">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted transition-colors duration-200 hover:text-brand-dark">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* تواصل معنا */}
        <div>
          <p className="mb-3 text-sm font-bold text-ink">تواصل معنا</p>
          <ul className="flex flex-col gap-2.5 text-sm text-muted">
            <li>بغداد - السيدية مقابل سايلو الدورة</li>
            <li>
              <span dir="ltr" style={{ unicodeBidi: "plaintext" }}>
                07751420001
              </span>
            </li>
            <li>
              <a
                href={buildGeneralWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContact("footer_link")}
                className="transition-colors duration-200 hover:text-brand-dark"
              >
                تواصل عبر واتساب
              </a>
            </li>
            <li className="flex gap-4 pt-1">
              <a
                href="https://www.facebook.com/share/1ccgPNjftp/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-brand-dark"
              >
                فيسبوك
              </a>
              <a
                href="https://www.instagram.com/mega_door?stkn=MXgxMm96NXE1anExaQ%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-brand-dark"
              >
                إنستغرام
              </a>
            </li>
          </ul>
        </div>
      </div>
      {/* pb-24 بالموبايل: حتى ما يغطي زر واتساب العائم سطر الحقوق بآخر الصفحة */}
      <div className="border-t border-border px-4 pb-24 pt-3.5 text-center text-xs text-muted sm:px-6 lg:pb-3.5">
        © {new Date().getFullYear()} MEGA DOOR — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
