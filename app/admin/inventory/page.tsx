// app/admin/inventory/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type StyleHit = {
  styleID: number;
  brandName: string;
  styleName: string;
  title?: string;
  styleImage?: string;
};

const searchCache = new Map<string, StyleHit[]>();

export default function InventorySearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StyleHit[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setResults([]);
      return;
    }

    const cached = searchCache.get(s);
    if (cached) {
      setResults(cached);
      return;
    }

    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(`/api/styles/search?q=${encodeURIComponent(s)}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        const data = await res.json();
        const arr: StyleHit[] = Array.isArray(data) ? data : (data?.results ?? []);
        searchCache.set(s, arr);
        setResults(arr);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Inventory Lookup</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gildan 3000"
        className="w-full rounded border px-4 py-3 text-lg mb-6"
      />

      {loading && <div className="opacity-60 mb-4">Searching…</div>}

      <ul className="space-y-3">
        {results.map((r) => (
          <li
            key={r.styleID}
            className="border rounded-lg p-3 flex items-center gap-4"
          >
            {r.styleImage ? (
              <img
                src={r.styleImage}
                alt={r.title || `${r.brandName} ${r.styleName}`}
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-gray-300/40 flex items-center justify-center text-xs">
                No Image
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {r.brandName} {r.styleName}
              </div>
              <div className="text-sm opacity-80 truncate">{r.title}</div>
            </div>

            <Link
              href={`/admin/inventory/${r.styleID}`}
              className="shrink-0 inline-flex items-center px-3 py-2 rounded bg-emerald-600 text-white hover:brightness-110"
            >
              View Inventory
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
