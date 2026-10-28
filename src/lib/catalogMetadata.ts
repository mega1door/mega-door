import type { DoorModel } from "../types/model";
import { getFullImageUrl } from "./imageUrl";

/** The public production address. Also used by the static-page generator. */
export const SITE_BASE = "https://mega1door.github.io/mega-door";
export const SITE_PATH = new URL(SITE_BASE).pathname;

export function absoluteSiteUrl(value = "/"): string {
  if (/^https?:\/\//i.test(value)) return new URL(value).href;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) throw new Error("Invalid public URL");
  const path = value.startsWith("/") ? value : `/${value}`;
  const relative = path === SITE_PATH ? "/" : path.startsWith(`${SITE_PATH}/`) ? path.slice(SITE_PATH.length) : path;
  return `${SITE_BASE}${relative}`;
}

/** Static hosting serves directory index pages at their trailing-slash URL. */
export function canonicalPageUrl(path = "/"): string {
  return absoluteSiteUrl(path.replace(/\/+$/, "") + "/");
}

export function modelMetadata(model: DoorModel, categoryLabel = "") {
  const details = [categoryLabel, model.material, model.color, model.dimensions ? `مقاس ${model.dimensions}` : "", model.usage]
    .map((value) => value?.trim()).filter(Boolean);
  const name = model.name.trim();
  const code = model.modelNumber.trim();
  const label = name === code ? `موديل ${code}` : `${name}، موديل ${code}`;
  const description = `${label} من ميكا للأبواب${details.length ? `: ${details.join("، ")}` : ""}.`;
  const images = model.images.filter(Boolean).map((url) => absoluteSiteUrl(getFullImageUrl(url)));
  return {
    title: `${name}${name === code ? "" : ` - ${code}`} | ميكا للأبواب`,
    description,
    path: `/model/${encodeURIComponent(model.id)}/`,
    canonical: canonicalPageUrl(`/model/${encodeURIComponent(model.id)}`),
    image: images[0] || absoluteSiteUrl("/images/brand/mega-door-logo.png"),
    alt: [label, categoryLabel, model.color].filter(Boolean).join(" — "),
    product: {
      "@context": "https://schema.org", "@type": "Product", name, sku: code,
      description,
      ...(categoryLabel ? { category: categoryLabel } : {}),
      ...(model.material?.trim() ? { material: model.material.trim() } : {}),
      ...(model.color?.trim() ? { color: model.color.trim() } : {}),
      ...(images.length ? { image: images } : {}),
      url: canonicalPageUrl(`/model/${encodeURIComponent(model.id)}`),
      brand: { "@type": "Brand", name: "ميكا للأبواب" },
    },
  };
}
