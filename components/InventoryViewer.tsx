// app/components/InventoryViewer.tsx
"use client";

import { useMemo, useState } from "react";
import type { ProductRow } from "@/lib/productsRepo"; // type only
import { imagesForColorWithFallback } from "@/lib/imageHelpers"; // client-safe helper

/** Inventory row shape passed in from the page (already aggregated by sku) */
type InvRow = { sku: string; totalQty: number };

type Props = {
  styleID: number;
  brandName: string;
  styleName: string;
  title?: string;

  /** All Products.csv rows for this style (client side) */
  products: ProductRow[];

  /** Live inventory rows, already aggregated per sku/size/color */
  inventory: InvRow[];

  /** List of colors for this style */
  colors: string[];

  /** Which color to show first, if any */
  preferredColor?: string;
};

/** Size ordering for apparel tables */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

/** Simple normalizer for S&S image URLs */
const urlOf = (p?: string) =>
  p?.startsWith("http") ? p : p ? `https://www.ssactivewear.com/${p}` : "";

/** ---------- Color Chip (accessibility-friendly) ---------- */
function Chip({
  label,
  active,
  swatch,
  onClick,
}: {
  label: string;
  active: boolean;
  swatch?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white/90 text-slate-900 border-slate-300 hover:bg-white",
      ].join(" ")}
      aria-pressed={active}
    >
      <span
        className="h-3 w-3 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: swatch || "#d1d5db" }}
        aria-hidden
      />
      {label}
    </button>
  );
}

/** Prefer text+model/front images before plain blocks */
function prioritizeGallery(urls: string[]) {
  // push obvious “block color” images later (often named Color or swatch)
  const bad = /colorswatch|\/color\//i;
  const withScore = urls.map((u) => ({
    u,
    s: bad.test(u) ? 100 : 0,
  }));
  withScore.sort((a, b) => a.s - b.s);
  return withScore.map((x) => x.u);
}

export default function InventoryViewer(props: Props) {
  const {
    products,
    inventory,
    brandName,
    styleName,
    title,
    styleID,
    preferredColor,
  } = props;

  /** Build a case-insensitive index by color */
  const byColor = useMemo(() => {
    const m: Record<string, ProductRow[]> = {};
    for (const r of products) {
      const key = (r.colorName || "").trim();
      if (!key) continue;
      (m[key] ||= []).push(r);
    }
    return m;
  }, [products]);

  /** swatch color (hex) for chips by color name */
  const swatchByColor = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of products) {
      const name = (r.colorName || "").trim();
      if (!name) continue;
      const hex = (r.color1 || "").trim();
      if (hex && !m[name]) m[name] = hex;
    }
    return m;
  }, [products]);

  /** totals by SKU from live inventory rows */
  const totalsBySku = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of inventory) m.set(r.sku, (m.get(r.sku) || 0) + (r.totalQty || 0));
    return m;
  }, [inventory]);

  /** choose default color (preferred -> any with stock -> first) */
  const colorList = Object.keys(byColor);
  const totalsByColor = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of colorList) {
      let total = 0;
      for (const r of byColor[c]) total += totalsBySku.get(r.sku) || 0;
      m[c] = total;
    }
    return m;
  }, [byColor, colorList, totalsBySku]);

  const defaultColor = useMemo(() => {
    if (preferredColor && colorList.includes(preferredColor)) return preferredColor;
    const withStock = colorList.find((c) => (totalsByColor[c] || 0) > 0);
    return withStock || colorList[0] || "Color";
  }, [preferredColor, colorList, totalsByColor]);

  const [color, setColor] = useState<string>(defaultColor);

  /** all rows for the selected color */
  const rowsForColor = byColor[color] ?? [];

  /** gallery (prioritized) */
  const gallery = useMemo(() => {
    if (!rowsForColor.length) return [] as string[];
    const urls = imagesForColorWithFallback(rowsForColor as any, products as any);
    return prioritizeGallery(urls);
  }, [rowsForColor, products]);

  /** main image */
  const [mainUrl, setMainUrl] = useState<string>(gallery[0] ?? "");
  // keep in sync if color/gallery changes
  useMemo(() => {
    setMainUrl(gallery[0] ?? "");
  }, [color, gallery]);

  /** sizes table rows: pick first row per size in known order */
  const tableRows = useMemo(() => {
    const bySize = new Map<string, ProductRow>();
    for (const r of rowsForColor) {
      if (!bySize.has(r.sizeName)) bySize.set(r.sizeName, r);
    }
    const order = [...bySize.keys()].sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return order.map((sz) => bySize.get(sz)!);
  }, [rowsForColor]);

  const totalQtyForColor = useMemo(
    () => rowsForColor.reduce((acc, r) => acc + (totalsBySku.get(r.sku) || 0), 0),
    [rowsForColor, totalsBySku]
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* ---------- LEFT: main image + thumbnails ---------- */}
      <div className="rounded-xl border border-black/5 bg-white shadow-sm p-3">
        {mainUrl ? (
          <div className="w-full">
            {/* Main image with a light “zoom” on hover (CSS scale) */}
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={urlOf(mainUrl) || ""}
                alt={`${styleName} ${color}`}
                className="mx-auto block max-h-[520px] w-auto select-none transition-transform duration-300 ease-out hover:scale-[1.06]"
                draggable={false}
              />
            </div>

            {/* Thumbnails — centered, scrollable when overflowing */}
            {gallery.length > 1 && (
              <div className="mt-3 flex justify-center">
                <div className="flex max-w-[640px] items-center gap-2 overflow-x-auto pb-1">
                  {gallery.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setMainUrl(g)}
                      className={[
                        "h-16 w-16 flex-none rounded-lg border p-1 transition",
                        g === mainUrl
                          ? "border-slate-900"
                          : "border-slate-300 hover:border-slate-400",
                      ].join(" ")}
                      aria-label="Thumbnail"
                    >
                      <img
                        src={urlOf(g) || ""}
                        alt=""
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[520px] items-center justify-center text-slate-500">
            No image
          </div>
        )}
      </div>

      {/* ---------- RIGHT: color chips + table ---------- */}
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {title || styleName}
          </h2>
          <p className="text-white/70">
            {brandName} {styleName}
          </p>
        </div>

        {/* Color chips (accessible) */}
        <div className="flex flex-wrap gap-2">
          {Object.keys(byColor).map((c) => (
            <Chip
              key={c}
              label={c}
              active={c === color}
              swatch={swatchByColor[c]}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        {/* Inventory table in a white card with dark text */}
        <div className="rounded-xl border border-black/5 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between px-4 pt-3">
            <h3 className="text-lg font-semibold text-slate-900">{color}</h3>
            <div className="text-xs text-slate-600">
              Total: {totalQtyForColor.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-sm text-slate-900">
              <thead className="bg-white/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Size</th>
                  <th className="px-3 py-2 text-left">Qty (total)</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-white/70 [&>tr:nth-child(odd)]:bg-white/40">
                {tableRows.map((r) => {
                  const qty = totalsBySku.get(r.sku) ?? 0;
                  const price =
                    r.salePrice && r.salePrice > 0
                      ? r.salePrice
                      : r.customerPrice && r.customerPrice > 0
                      ? r.customerPrice
                      : r.piecePrice && r.piecePrice > 0
                      ? r.piecePrice
                      : undefined;

                  return (
                    <tr key={r.sku}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {r.sizeName}
                      </td>
                      <td className="px-3 py-2">{qty.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {price ? price.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2">{r.sku}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 text-xs text-slate-500">
            Style #{styleID} — {brandName} {styleName}
          </div>
        </div>
      </div>
    </div>
  );
}
