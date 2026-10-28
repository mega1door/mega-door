import type { DoorModel } from "../types/model";
import { getFullImageUrl } from "./imageUrl";
import { doorName } from "./doorIdentity";

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
  const name = doorName(model, categoryLabel);
  const details = [categoryLabel, model.colorCode?.trim() ? `كود اللون ${model.colorCode.trim()}` : "", model.dimensions ? `مقاس ${model.dimensions}` : "", model.usage, ...(model.specs || [])]
    .map((value) => value?.trim()).filter(Boolean);
  const code = model.modelNumber.trim();
  const description = `${name} من ميكا للأبواب${details.length ? `: ${details.join("، ")}` : ""}.`;
  const images = model.images.filter(Boolean).map((url) => absoluteSiteUrl(getFullImageUrl(url)));
  return {
    name,
    title: `${name} | ميكا للأبواب`,
    description,
    path: `/model/${encodeURIComponent(model.id)}/`,
    canonical: canonicalPageUrl(`/model/${encodeURIComponent(model.id)}`),
    image: images[0] || absoluteSiteUrl("/images/brand/mega-door-logo.png"),
    alt: [name, model.colorCode?.trim() ? `كود اللون ${model.colorCode.trim()}` : ""].filter(Boolean).join(" — "),
    product: {
      "@context": "https://schema.org", "@type": "Product", name, sku: code,
      description,
      ...(categoryLabel ? { category: categoryLabel } : {}),
      ...(model.material?.trim() ? { material: model.material.trim() } : {}),
      ...(model.color?.trim() ? { color: model.color.trim() } : {}),
      additionalProperty: [
        ...(model.colorCode?.trim() ? [{ "@type": "PropertyValue", name: "كود اللون", value: model.colorCode.trim() }] : []),
        ...(model.dimensions?.trim() ? [{ "@type": "PropertyValue", name: "القياسات", value: model.dimensions.trim() }] : []),
        ...(model.specs || []).filter(spec => spec.trim()).map(spec => ({ "@type": "PropertyValue", name: "مواصفة", value: spec.trim() })),
      ],
      ...(images.length ? { image: images } : {}),
      url: canonicalPageUrl(`/model/${encodeURIComponent(model.id)}`),
      brand: { "@type": "Brand", name: "ميكا للأبواب" },
    },
  };
}
