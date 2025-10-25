// lib/stylesRepo.ts
import fs from "fs";
import path from "path";

export type StyleRow = {
  styleID: number;
  brandName: string;
  styleName: string;
  title?: string;
  description?: string;
  image?: string;        // resolved preferred image (styleImage/image/brandImage)
  brandImage?: string;   // optional: raw brand image if present
};

// ----- Global cache so Styles.csv is loaded once per runtime
const g = globalThis as unknown as {
  __STYLES__?: StyleRow[];
  __STYLES_LOADED__?: boolean;
};

let STYLES: StyleRow[] = [];

// ---------- Small CSV parser (handles quotes + commas) ----------
function parseCSVLine(line: string, delim = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (!inQuotes && ch === delim) {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }

    cur += ch;
    i++;
  }

  out.push(cur);
  return out;
}

// ---------- Load / parse (with caching) ----------
function _loadStylesFromDisk(): StyleRow[] {
  const STYLES_PATH = path.join(process.cwd(), "data", "Styles.csv");
  const csvText = fs.readFileSync(STYLES_PATH, "utf8");

  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());

  const rows: StyleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => (rec[h] = (cols[idx] ?? "").trim()));

    const styleID =
      parseInt(rec["styleID"] || rec["StyleID"] || rec["styleId"] || rec["StyleId"] || "", 10);

    if (!Number.isFinite(styleID)) continue; // skip bad row

    const brandName = rec["brandName"] || rec["BrandName"] || "";
    const styleName = rec["styleName"] || rec["StyleName"] || "";

    const title = rec["title"] || rec["Title"] || "";
    const description = rec["description"] || rec["Description"] || "";

    const styleImg =
      rec["styleImage"] ||
      rec["StyleImage"] ||
      rec["styleImageUrl"] ||
      rec["styleImageURL"] ||
      "";
    const genericImg = rec["image"] || rec["Image"] || "";
    const brandImg = rec["brandImage"] || rec["BrandImage"] || "";

    const image = styleImg || genericImg || brandImg || "";

    rows.push({
      styleID,
      brandName,
      styleName,
      title,
      description,
      image,
      brandImage: brandImg || undefined,
    });
  }

  return rows;
}

// If already cached, reuse
if (g.__STYLES__ && g.__STYLES_LOADED__) {
  STYLES = g.__STYLES__;
} else {
  const parsedRows = _loadStylesFromDisk();
  STYLES = parsedRows;
  g.__STYLES__ = STYLES;
  g.__STYLES_LOADED__ = true;
  console.log(`[stylesRepo] ✅ Loaded ${STYLES.length} styles from Styles.csv`);
}

// ---------- Public API ----------
export function getByStyleID(id: number | string): StyleRow | undefined {
  const n = typeof id === "string" ? parseInt(id, 10) : id;
  return STYLES.find((s) => s.styleID === n);
}

// Tokenized search: all tokens must match somewhere in brand/style/title
export function searchStyles(query: string, limit = 50): StyleRow[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  return STYLES.filter((s) => {
    const hay = `${s.brandName ?? ""} ${s.styleName ?? ""} ${s.title ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  }).slice(0, limit);
}

export function listAllStyles(): StyleRow[] {
  return STYLES;
}

// Optional: force reload helper (e.g., admin “Refetch styles”)
export function loadStyles(refresh = false): StyleRow[] {
  if (!refresh && g.__STYLES_LOADED__) return g.__STYLES__!;
  const parsedRows = _loadStylesFromDisk();
  g.__STYLES__ = parsedRows;
  g.__STYLES_LOADED__ = true;
  STYLES = parsedRows;
  console.log(`[stylesRepo] ♻️ Reloaded ${STYLES.length} styles from Styles.csv`);
  return STYLES;
}
