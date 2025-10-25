// lib/productsRepo.ts
import path from "path";
import fs from "fs";

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

type RepoShape = {
  products: ProductRow[];
  byStyleSkuMap: Map<number, Map<string, ProductRow>>;
};

const g = globalThis as unknown as { __PRODUCTS_REPO?: RepoShape };

let REPO: RepoShape | undefined = g.__PRODUCTS_REPO;

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", i = 0, inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      cur += ch; i += 1; continue;
    } else {
      if (ch === '"') { inQuotes = true; i += 1; continue; }
      if (ch === delim) { out.push(cur); cur = ""; i += 1; continue; }
      cur += ch; i += 1;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(headerLine: string): string {
  const c = (re: RegExp) => (headerLine.match(re) || []).length;
  const cand: Array<[string, number]> = [[",", c(/,/g)], ["\t", c(/\t/g)], [";", c(/;/g)], ["|", c(/\|/g)]];
  cand.sort((a,b) => b[1] - a[1]);
  return cand[0][1] > 0 ? cand[0][0] : ",";
}

function loadOnce(): RepoShape {
  if (REPO) return REPO;

  const fileCsv = path.join(process.cwd(), "data", "Products.csv");
  if (!fs.existsSync(fileCsv)) {
    console.warn(`[productsRepo] ⚠️ Products.csv not found at ${fileCsv}`);
    REPO = { products: [], byStyleSkuMap: new Map() };
    g.__PRODUCTS_REPO = REPO;
    return REPO;
  }

  let content = fs.readFileSync(fileCsv, "utf8");
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    console.warn("[productsRepo] ⚠️ Products.csv is empty or missing headers");
    REPO = { products: [], byStyleSkuMap: new Map() };
    g.__PRODUCTS_REPO = REPO;
    return REPO;
  }

  const delim = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delim).map((h) => h.trim().toLowerCase());
  const idx = (n: string) => headers.indexOf(n.toLowerCase());
  const get = (cols: string[], n: string) => (idx(n) >= 0 ? cols[idx(n)] ?? "" : "");
  const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };

  const products: ProductRow[] = [];
  const byStyleSkuMap = new Map<number, Map<string, ProductRow>>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], delim);
    const rec: ProductRow = {
      sku: get(cols, "sku"),
      gtin: get(cols, "gtin"),
      skuID_Master: Number(get(cols, "skuid_master")) || 0,
      styleID: Number(get(cols, "styleid")) || 0,
      brandName: get(cols, "brandname"),
      styleName: get(cols, "stylename"),
      colorName: get(cols, "colorname"),
      colorCode: get(cols, "colorcode"),
      colorPriceCodeName: get(cols, "colorpricecodename"),
      colorGroup: get(cols, "colorgroup"),
      colorFamily: get(cols, "colorfamily"),
      colorSwatchImage: get(cols, "colorswatchimage"),
      colorSwatchTextColor: get(cols, "colorswatchtextcolor"),
      colorFrontImage: get(cols, "colorfrontimage"),
      colorSideImage: get(cols, "colorsideimage"),
      colorBackImage: get(cols, "colorbackimage"),
      colorDirectSideImage: get(cols, "colordirectsideimage"),
      colorOnModelFrontImage: get(cols, "coloronmodelfrontimage"),
      colorOnModelSideImage: get(cols, "coloronmodelsideimage"),
      colorOnModelBackImage: get(cols, "coloronmodelbackimage"),
      color1: get(cols, "color1"),
      color2: get(cols, "color2"),
      sizeName: get(cols, "sizename"),
      sizeCode: get(cols, "sizecode"),
      sizeOrder: get(cols, "sizeorder"),
      sizePriceCodeName: get(cols, "sizepricecodename"),
      caseQty: num(get(cols, "caseqty")),
      unitWeight: num(get(cols, "unitweight")),
      MAPPrice: num(get(cols, "mapprice")),
      piecePrice: num(get(cols, "pieceprice")),
      dozenPrice: num(get(cols, "dozenprice")),
      casePrice: num(get(cols, "caseprice")),
      salePrice: num(get(cols, "saleprice")),
      customerPrice: num(get(cols, "customerprice")),
    };
    if (!rec.styleID || !rec.sku) continue;
    products.push(rec);

    let m = byStyleSkuMap.get(rec.styleID);
    if (!m) { m = new Map(); byStyleSkuMap.set(rec.styleID, m); }
    m.set(rec.sku, rec);
  }

  console.log(`[productsRepo] ✅ Ready: ${products.length} rows (delimiter "${delim}")`);
  REPO = { products, byStyleSkuMap };
  g.__PRODUCTS_REPO = REPO;
  return REPO;
}

export function getProductsByStyleID(styleID: number | string): ProductRow[] {
  const repo = loadOnce();
  const id = Number(styleID);
  return repo.products.filter((p) => p.styleID === id);
}

export function listColorsForStyle(styleID: number | string): string[] {
  const rows = getProductsByStyleID(styleID);
  const colors: string[] = [];
  for (const r of rows) if (r.colorName && !colors.includes(r.colorName)) colors.push(r.colorName);
  return colors;
}

/** Fast lookup: sku -> ProductRow (for a given style) */
export function getSkuMapForStyle(styleID: number | string): Map<string, ProductRow> {
  const repo = loadOnce();
  return repo.byStyleSkuMap.get(Number(styleID)) ?? new Map();
}
