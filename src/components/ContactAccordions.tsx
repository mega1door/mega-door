import { buildSalesWhatsAppLink } from "../lib/whatsapp";
import { trackContact } from "../lib/metaPixel";
import { useSiteSettings } from "../lib/siteSettingsStore";

/** رابط خرائط Google الحقيقي للمعرض (مؤكد من ميكا). */
const SHOWROOM_MAPS_URL = "https://maps.app.goo.gl/hPryTsSq2c1xASfNA?g_st=ic";
const SHOWROOM_ADDRESS = "بغداد – السيدية، مقابل سايلو الدورة";

const summaryClass =
  "flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 transition-colors duration-200 hover:bg-white/5 hover:text-ink group-open:text-ink [&::-webkit-details-marker]:hidden";
const detailLinkClass =
  "flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/85 transition-colors hover:bg-white/5";

/**
 * خيارا «التواصل» و«عنوان المعرض» (تنفتح وتنسكر) - نفس المكوّن بقائمة الهمبرغر والفوتر.
 * source يميّز مصدر الضغط بتتبع Meta Pixel.
 */
export default function ContactAccordions({ source }: { source: "menu" | "footer" }) {
  const { contactEmail } = useSiteSettings();
  return (
    <>
      <details className="group">
        <summary className={summaryClass}>
          التواصل
          <Chevron />
        </summary>
        <div className="flex flex-col pb-1 pr-3">
          <a
            href={buildSalesWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContact(`${source}_sales`)}
            className={detailLinkClass}
          >
            <WhatsAppIcon />
            <span className="flex flex-col leading-6">
              <span>قسم المبيعات</span>
              <span dir="ltr" className="self-start text-[13px] text-muted [unicode-bidi:isolate]">
                07751420001
              </span>
            </span>
          </a>
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className={detailLinkClass}>
              <MailIcon />
              <span dir="ltr" className="[unicode-bidi:isolate]">
                {contactEmail}
              </span>
            </a>
          )}
        </div>
      </details>

      <details className="group">
        <summary className={summaryClass}>
          عنوان المعرض
          <Chevron />
        </summary>
        <div className="flex flex-col pb-1 pr-3">
          <p className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink/85">
            <PinIcon />
            {SHOWROOM_ADDRESS}
          </p>
          <a href={SHOWROOM_MAPS_URL} target="_blank" rel="noopener noreferrer" className={detailLinkClass}>
            <span className="w-[18px] shrink-0" aria-hidden="true" />
            <span className="font-semibold text-bronze-light underline underline-offset-4 lg:text-brand-dark">
              عرض على خرائط Google
            </span>
          </a>
        </div>
      </details>
    </>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-[18px] w-[18px] shrink-0 text-bronze-light lg:text-brand-dark" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] shrink-0 text-whatsapp" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm4.52 11.87c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-[18px] w-[18px] shrink-0 text-bronze-light lg:text-brand-dark" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  );
}
