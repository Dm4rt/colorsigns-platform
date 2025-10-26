// app/admin/inventory/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type StyleResult = {
  styleID: number;
  brandName: string;
  styleName: string;
  title?: string;
  styleImage?: string;
};

export default function InventorySearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StyleResult[]>([]);

  // simple debounce
  const debouncedQ = useDebounce(q, 200);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!debouncedQ.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await fetch(`/api/styles/search?q=${encodeURIComponent(debouncedQ)}`);
        const { results } = await r.json();
        if (!active) return;
        setResults(results || []);
      } catch (e) {
        if (!active) return;
        setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [debouncedQ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Inventory Lookup</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gildan 3000"
        className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400"
      />

      {loading && <div className="opacity-70 text-sm mt-3">Searching…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {results.map((r) => (
          <div
            key={r.styleID}
            className="bg-teal-900/20 rounded-2xl p-4 shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
          >
            <div className="w-full h-64 rounded-xl overflow-hidden bg-white/10 mb-4">
              {r.styleImage ? (
                <img
                  src={r.styleImage.startsWith("http") ? r.styleImage : `https://www.ssactivewear.com/${r.styleImage}`}
                  alt={`${r.brandName} ${r.styleName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/70">
                  No Image
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="font-bold text-lg">{r.brandName} {r.styleName}</h2>
              <p className="text-sm opacity-80">{r.title ?? ""}</p>
            </div>

            <div className="pt-4">
              <Link
                href={`/admin/inventory/${r.styleID}`}
                className="inline-flex items-center justify-center rounded-md bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 transition"
              >
                View Inventory
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
