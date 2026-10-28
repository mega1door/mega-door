export const categories = [
  { id: "interior", label: "الأبواب الداخلية والحمامات" },
  { id: "exterior", label: "الأبواب الخارجية" },
];
const colors = ["أبيض", "جوزي", "أسود", "رمادي", "بيج", "بني", "أزرق"];
export const models = colors.map((color, i) => ({
  id: `test-door-${String(i + 1).padStart(4, "0")}`,
  modelNumber: String(i + 1).padStart(4, "0"),
  name: `اسم محفوظ ${i + 1}`,
  category: "interior", material: "HDF", color,
  colorCode: i === 1 ? "205" : String(201 + i).padStart(4, "0"),
  dimensions: "100 × 210 سم", specs: ["مواصفة اختبار مشتركة مؤكدة"],
  images: [`/test-assets/door-${i + 1}.svg`], isPopular: false,
}));
