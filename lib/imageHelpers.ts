// lib/imageHelpers.ts

/** Accept relative S&S image paths and turn them into absolute URLs */
export function normalizeUrl(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^images\//i.test(s)) return `https://www.ssactivewear.com/${s}`;
  if (/^\/?images\//i.test(s)) {
    return `https://www.ssactivewear.com/${s.replace(/^\//, "")}`;
  }
  return null;
}

/** True if url looks like a color chip/swatch (we avoid showing these as main image) */
export function isSwatch(url: string): boolean {
  return /colorswatch|swatch/i.test(url);
}

/** Prefer “on-model” and “front” images over backs/sides; avoid swatches */
export function rankImage(url: string): number {
  const u = url.toLowerCase();
  if (isSwatch(u)) return 9999;
  let score = 1000;
  if (/onmodel|model/.test(u)) score -= 600;
  if (/front/.test(u)) score -= 300;
  if (/side/.test(u)) score -= 100;
  if (/back/.test(u)) score -= 50;
  // “no background / product only”
  if (/_fm\.(jpe?g|png|webp)$/.test(u)) score -= 30;
  return score;
}

/** Sort a set of urls with the “best shirt image first” */
export function sortGallery(urls: string[]): string[] {
  const uniq: string[] = [];
  for (const u of urls) {
    if (!u) continue;
    const n = normalizeUrl(u);
    if (!n) continue;
    if (!/\.(png|jpe?g|webp)$/i.test(n)) continue;
    if (!uniq.includes(n)) uniq.push(n);
  }
  return uniq.sort((a, b) => rankImage(a) - rankImage(b));
}

/**
 * Build a gallery for a color with STYLE-LEVEL fallback:
 *  - first: images from the color’s own rows
 *  - then: any images from other colors of the same style
 * Caller should pass rows for the color and all rows for the style (Products.csv)
 */
export function imagesForColorWithFallback(
  colorRows: any[],
  allRows: any[]
): string[] {
  const out: string[] = [];

  const collect = (row: any) => {
    for (const [k, v] of Object.entries(row)) {
      if (/image$/i.test(k) && typeof v === "string") {
        const n = normalizeUrl(v);
        if (n && /\.(png|jpe?g|webp)$/i.test(n) && !out.includes(n)) out.push(n);
      }
    }
  };

  for (const r of colorRows) collect(r);
  if (out.length === 0) for (const r of allRows) collect(r);

  return sortGallery(out);
}
