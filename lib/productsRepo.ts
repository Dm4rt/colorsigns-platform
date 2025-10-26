import fs from "fs";
import path from "path";

/** Shape of a parsed Products.csv row (only the fields we actually use) */
export type ProductRow = {
  sku: string;
  gtin: string;
  skuID_Master: number;
  styleID: number;
  brandName: string;
  styleName: string;

  colorName: string;
  colorCode: string;
  colorPriceCodeName: string;
  colorGroup: string;
  colorFamily: string;

  colorSwatchImage?: string;
  colorSwatchTextColor?: string;

  colorFrontImage?: string;
  colorSideImage?: string;
  colorBackImage?: string;
  colorDirectSideImage?: string;
  colorOnModelFrontImage?: string;
  colorOnModelSideImage?: string;
  colorOnModelBackImage?: string;

  color1?: string;
  color2?: string;

  sizeName: string;
  sizeCode: string;
  sizeOrder: string;
  sizePriceCodeName: string;

  caseQty?: number;
  unitWeight?: number;
  MAPPrice?: number;
  piecePrice?: number;
  dozenPrice?: number;
  casePrice?: number;
  salePrice?: number;
  customerPrice?: number;
};

let PRODUCTS: ProductRow[] = [];
let LOADED = false;

function csvParseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
      continue;
    }
    if (!q && ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeUrl(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^images\//i.test(s)) {
    return `https://www.ssactivewear.com/${s}`;
  }
  if (/^\/?images\//i.test(s)) {
    return `https://www.ssactivewear.com/${s.replace(/^\//, "")}`;
  }
  return null;
}

/** Load Products.csv once per runtime */
export function ensureProductsLoaded() {
  if (LOADED) return;
  const p = path.join(process.cwd(), "data", "Products.csv");
  const text = fs.readFileSync(p, "utf8");
  const lines = text.trim().split(/\r?\n/);
  const headers = csvParseLine(lines.shift() || "");

  const rows: ProductRow[] = lines.map((ln) => {
    const cols = csvParseLine(ln);
    const rec: any = {};
    headers.forEach((h, i) => (rec[h] = cols[i]));
    const row: ProductRow = {
      sku: rec["sku"],
      gtin: rec["gtin"],
      skuID_Master: Number(rec["skuID_Master"]),
      styleID: Number(rec["styleID"]),
      brandName: rec["brandName"],
      styleName: rec["styleName"],

      colorName: rec["colorName"],
      colorCode: rec["colorCode"],
      colorPriceCodeName: rec["colorPriceCodeName"],
      colorGroup: rec["colorGroup"],
      colorFamily: rec["colorFamily"],

      colorSwatchImage: rec["colorSwatchImage"],
      colorSwatchTextColor: rec["colorSwatchTextColor"],

      colorFrontImage: rec["colorFrontImage"],
      colorSideImage: rec["colorSideImage"],
      colorBackImage: rec["colorBackImage"],
      colorDirectSideImage: rec["colorDirectSideImage"],
      colorOnModelFrontImage: rec["colorOnModelFrontImage"],
      colorOnModelSideImage: rec["colorOnModelSideImage"],
      colorOnModelBackImage: rec["colorOnModelBackImage"],

      color1: rec["color1"],
      color2: rec["color2"],

      sizeName: rec["sizeName"],
      sizeCode: rec["sizeCode"],
      sizeOrder: rec["sizeOrder"],
      sizePriceCodeName: rec["sizePriceCodeName"],

      caseQty: Number(rec["CaseQty"]),
      unitWeight: Number(rec["unitWeight"]),
      MAPPrice: Number(rec["MAPPrice"]),
      piecePrice: Number(rec["piecePrice"]),
      dozenPrice: Number(rec["dozenPrice"]),
      casePrice: Number(rec["casePrice"]),
      salePrice: Number(rec["salePrice"]),
      customerPrice: Number(rec["customerPrice"]),
    };
    return row;
  });

  PRODUCTS = rows;
  LOADED = true;
  console.log(`[productsRepo] ✅ Ready: ${PRODUCTS.length} rows (delimiter ",")`);
}

/** All products for a given styleID */
export function getProductsByStyleID(styleID: number) {
  ensureProductsLoaded();
  return PRODUCTS.filter((r) => r.styleID === Number(styleID));
}

/** Colors available in a style (unique, in CSV order) */
export function listColorsForStyle(styleID: number): string[] {
  return Array.from(
    new Set(getProductsByStyleID(styleID).map((r) => r.colorName).filter(Boolean))
  );
}

/** Build a fast “color → rows[]” map for a style */
export function getSkuMapForStyle(styleID: number) {
  const rows = getProductsByStyleID(styleID);
  const map = new Map<string, ProductRow[]>();
  for (const r of rows) {
    const key = (r.colorName || "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

/** Preferred order of image fields (from best to fallback) */
const IMAGE_FIELDS: (keyof ProductRow)[] = [
  "colorOnModelFrontImage",
  "colorOnModelSideImage",
  "colorOnModelBackImage",
  "colorFrontImage",
  "colorSideImage",
  "colorBackImage",
  "colorDirectSideImage",
];

/** Collect and dedupe image URLs from one row */
function collectImageUrlsFromRow(row: ProductRow): string[] {
  const urls: string[] = [];

  for (const f of IMAGE_FIELDS) {
    const raw = row[f] as unknown;
    const n = normalizeUrl(typeof raw === "string" ? raw : null);
    if (n && /\.(png|jpe?g|webp)$/i.test(n) && !urls.includes(n)) {
      urls.push(n);
    }
  }

  // Be generous: any key that ends with "Image"
  for (const [k, v] of Object.entries(row) as [string, unknown][]) {
    if (/image$/i.test(k) && typeof v === "string") {
      const n = normalizeUrl(v);
      if (n && /\.(png|jpe?g|webp)$/i.test(n) && !urls.includes(n)) {
        urls.push(n);
      }
    }
  }
  return urls;
}

/**
 * Get a gallery for a color with STYLE-LEVEL fallback:
 *  - first: images from the color’s own rows
 *  - then: any images from other colors of the same style
 */
export function imagesForColorWithFallback(
  colorRows: ProductRow[],
  allStyleRows: ProductRow[]
): string[] {
  const out: string[] = [];

  // 1) Color rows
  for (const r of colorRows) {
    for (const u of collectImageUrlsFromRow(r)) {
      if (!out.includes(u)) out.push(u);
    }
  }
  if (out.length > 0) return out;

  // 2) Fallback to any image in this style
  for (const r of allStyleRows) {
    for (const u of collectImageUrlsFromRow(r)) {
      if (!out.includes(u)) out.push(u);
    }
  }
  return out;
}
