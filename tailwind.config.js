/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Amiri", "Tajawal", "Tahoma", "serif"],
        body: ["Tajawal", "Tahoma", "sans-serif"],
      },
      colors: {
        // Dark theme مطابق للمرجع البصري الذي اعتمده العميل: خلفية داكنة + أزرق Accent فاتح
        ink: "#F4F6FB",
        surface: "#0F1424",
        canvas: "#05070D",
        muted: "#8B93A8",
        border: "#FFFFFF17",
        brand: {
          DEFAULT: "#1489FF",
          dark: "#59AAFF",
          soft: "#142544",
        },
        silver: {
          DEFAULT: "#9AA1AC",
          light: "#C7CCD3",
          dark: "#565B66",
        },
        whatsapp: "#25D366",
        // واجهة الموبايل المعتمدة (المرجع البصري النهائي): خلفية فحمية + لمسات برونزية.
        // مستخدمة بالموبايل فقط (أقل من lg) - الديسكتوب يبقى على ألوانه الحالية.
        charcoal: {
          DEFAULT: "#0E171C",
          card: "#131E25",
          deep: "#0A1216",
        },
        bronze: {
          DEFAULT: "#BB8058",
          light: "#C9956E",
        },
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};
