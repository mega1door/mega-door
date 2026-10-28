import { useEffect } from "react";
import { setPageSEO } from "../lib/seo";

/**
 * الأسئلة الشائعة - أجوبة مؤكدة فقط (من بيانات الموقع نفسه). أسئلة الضمان
 * والتوصيل والأسعار التفصيلية بانتظار أجوبة معتمدة من ميكا، فما تنعرض.
 */
const faqs = [
  {
    q: "شلون أستفسر عن موديل معيّن؟",
    a: "افتح صفحة الموديل من زر «عرض التفاصيل»، واضغط زر الاستفسار عبر واتساب. تنفتح رسالة جاهزة بيها اسم الموديل وكوده.",
  },
  {
    q: "هل أكدر أشتري أو أدفع من الموقع؟",
    a: "لا، الموقع كتالوج لعرض الموديلات فقط. الطلب والاستفسار يكون مباشرة ويانه عبر واتساب.",
  },
  {
    q: "هل الأسعار معروضة بالموقع؟",
    a: "لا، الأسعار حالياً غير معروضة. راسلنا على واتساب بكود الموديل اللي عجبك.",
  },
  {
    q: "وين موقعكم؟",
    a: "بغداد - السيدية، مقابل سايلو الدورة. رقمنا 07751420001.",
  },
];

export default function FaqPage() {
  useEffect(() => {
    setPageSEO({
      title: "الأسئلة الشائعة | ميكا للأبواب",
      description: "أجوبة على أكثر الأسئلة تكراراً عن كتالوج ميكا للأبواب في بغداد وطريقة الاستفسار عبر واتساب.",
      path: "/faq",
    });
  }, []);

  return (
    <div className="mx-auto max-w-[760px] px-4 pb-6 pt-8 text-right sm:px-6 lg:pt-14">
      <h1 className="text-[24px] font-bold text-ink lg:text-[30px]">الأسئلة الشائعة</h1>
      <div className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-[14px] border border-white/[0.06] bg-charcoal-card lg:border-border lg:bg-surface">
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-bronze-light transition-transform duration-200 group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-[14px] leading-7 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
