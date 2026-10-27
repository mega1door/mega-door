import { buildGeneralWhatsAppLink } from "../lib/whatsapp";
import { trackContact } from "../lib/metaPixel";

/** زر واتساب عائم يظهر في كل صفحات الموقع */
export default function WhatsAppButton() {
  return (
    <a
      href={buildGeneralWhatsAppLink()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackContact("floating_button")}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition hover:brightness-105 active:scale-95 lg:bottom-5 lg:left-5 lg:h-auto lg:w-auto lg:gap-2 lg:px-4 lg:py-3 lg:shadow-lg lg:shadow-black/10"
      aria-label="تواصل معنا عبر واتساب"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 shrink-0 lg:h-6 lg:w-6" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.25c0-4.52 3.68-8.2 8.24-8.2 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.53-3.68 8.07-8.24 8.07Zm4.52-6.15c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.16-.29.18-.54.06-.25-.12-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z" />
      </svg>
      <span className="hidden text-sm font-bold lg:inline">تواصل واتساب</span>
    </a>
  );
}
