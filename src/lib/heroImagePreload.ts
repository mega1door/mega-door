/** Start loading the admin-selected first hero image before React renders its slide. */
export function preloadHeroImage(url: string | null | undefined): void {
  if (!url || typeof document === "undefined") return;

  const existing = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]'))
    .some((link) => link.href === url);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.setAttribute("fetchpriority", "high");
  document.head.append(link);
}
