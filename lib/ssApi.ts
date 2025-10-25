// lib/ssApi.ts
import fs from "fs";
import path from "path";

const API_BASE = "https://api.ssactivewear.com/v2";
const ACCOUNT = process.env.SS_ACCOUNT || process.env.SS_ACCOUNT_NUMBER || "";
const KEY = process.env.SS_API_KEY || "";

// tweak TTL as you like
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_DIR = path.join(process.cwd(), ".cache", "ssinv");

// in-memory cache (fast path)
const g = globalThis as unknown as {
  __SS_INV_CACHE?: Map<string, { ts: number; data: any }>;
};
if (!g.__SS_INV_CACHE) g.__SS_INV_CACHE = new Map();

function cacheFile(styleID: string) {
  return path.join(CACHE_DIR, `inventory-${styleID}.json`);
}

async function readFileCache(styleID: string) {
  try {
    const f = cacheFile(styleID);
    const stat = fs.statSync(f);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS) {
      const txt = fs.readFileSync(f, "utf8");
      return JSON.parse(txt);
    }
  } catch {}
  return null;
}

async function writeFileCache(styleID: string, data: any) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile(styleID), JSON.stringify(data));
  } catch {}
}

type FetchOpts = { refresh?: boolean };

export async function fetchInventory(styleID: number | string, opts: FetchOpts = {}) {
  const id = String(styleID);
  const key = `inv:${id}`;
  const now = Date.now();

  // memory cache
  const mem = g.__SS_INV_CACHE!.get(key);
  if (mem && !opts.refresh && now - mem.ts < CACHE_TTL_MS) return mem.data;

  // file cache
  if (!opts.refresh) {
    const file = await readFileCache(id);
    if (file) {
      g.__SS_INV_CACHE!.set(key, { ts: now, data: file });
      return file;
    }
  }

  // fetch from S&S
  const url = `${API_BASE}/inventory/?style=${encodeURIComponent(id)}`;
  const auth = Buffer.from(`${ACCOUNT}:${KEY}`).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[S&S] ${res.status} ${res.statusText} – ${body}`);
  }

  const data = await res.json();
  // store both caches
  g.__SS_INV_CACHE!.set(key, { ts: now, data });
  await writeFileCache(id, data);
  return data;
}
