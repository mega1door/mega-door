import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchModels } from "../data/models";
import { useModels } from "../lib/modelsStore";
import { useCategories } from "../lib/categoriesStore";
import ProductCard from "../components/ProductCard";
import { setPageSEO } from "../lib/seo";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);

  useEffect(() => {
    setPageSEO({
      title: query ? `نتائج البحث عن "${query}" | ميكا للأبواب` : "بحث عن موديل | ميكا للأبواب",
      description: "ابحث عن موديلات أبواب ميكا حسب الاسم أو كود الموديل أو النوع أو اللون.",
      path: "/search",
      noindex: true,
    });
  }, [query]);

  useEffect(() => setInput(query), [query]);

  const allModels = useModels();
  const categories = useCategories();
  const results = searchModels(allModels, query, categories);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:py-20">
      <h1 className="font-display text-2xl font-bold text-ink">البحث عن موديل</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex max-w-md gap-2">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب اسم الموديل أو رقمه أو اللون..."
          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none"
          aria-label="بحث عن موديل"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-canvas"
        >
          بحث
        </button>
      </form>

      {query && (
        <p className="mt-6 text-sm text-muted">
          {results.length > 0 ? `${results.length} نتيجة لـ "${query}"` : `لا توجد نتائج لـ "${query}"`}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {results.map((model) => (
            <ProductCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
