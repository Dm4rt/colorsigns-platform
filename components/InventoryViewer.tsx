// app/components/InventoryViewer.tsx
"use client";

import { useMemo, useState } from "react";

type ProductRow = {
  sku: string;
  colorName: string;
  colorSwatchImage?: string;
  colorOnModelFrontImage?: string;
  colorFrontImage?: string;
  sizeName: string;
  salePrice?: number;
  customerPrice?: number;
  piecePrice?: number;
};

type InvRow = { sku: string; totalQty: number };

type Props = {
  styleID: number;
  brandName: string;
  styleName: string;
  title?: string;
  // Products.csv data scoped to this style:
  products: ProductRow[];
  colors: string[];
  // Inventory rows (already aggregated per sku/size/color):
  inventory: InvRow[];
  preferredColor: string;
};

const SIZE_ORDER = ["XS","S","M","L","XL","2XL","3XL","4XL","5XL","6XL"];
const orderSizes = (sizes: string[]) =>
  [...sizes].sort((a,b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

const urlOf = (p?: string) => p ? (p.startsWith("http") ? p : `https://www.ssactivewear.com/${p}`) : "";

export default function InventoryViewer(props: Props) {
  const { products, colors, inventory, brandName, styleName, title, styleID, preferredColor } = props;

  const [color, setColor] = useState(preferredColor);

  // Index by color
  const byColor = useMemo(() => {
    const m: Record<string, ProductRow[]> = {};
    for (const p of products) (m[p.colorName] ||= []).push(p);
    return m;
  }, [products]);

  // Inventory map by sku
  const invBySku = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of inventory) m.set(r.sku, r.totalQty || 0);
    return m;
  }, [inventory]);

  // Current color products & sizes
  const prods = byColor[color] || [];
  const sizes = orderSizes(Array.from(new Set(prods.map(p => p.sizeName))));

  const sample = prods[0];
  const imgUrl = urlOf(sample?.colorOnModelFrontImage) || urlOf(sample?.colorFrontImage);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="text-2xl font-semibold mb-1">{brandName} {styleName}</div>
      {title && <div className="opacity-80 mb-6">{title}</div>}

      {/* color chips (no navigation, no API) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {colors.map((c) => {
          const sw = byColor[c]?.[0]?.colorSwatchImage;
          const active = c === color;
          return (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`px-3 py-1 rounded-full border inline-flex items-center gap-2 ${active ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              {sw && <img src={urlOf(sw)} alt={c} className="w-5 h-5 object-cover rounded" />}
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      <section className="mb-12">
        <div className="flex gap-6 items-start">
          {imgUrl ? (
            <img src={imgUrl} alt={color} className="w-48 h-48 object-contain bg-white rounded" />
          ) : (
            <div className="w-48 h-48 rounded bg-white/20 grid place-items-center">No Image</div>
          )}

          <div className="flex-1 overflow-auto">
            <div className="font-semibold mb-2">{color}</div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-white/10">
                  <th className="text-left p-2 border">Size</th>
                  <th className="text-left p-2 border">Qty (total)</th>
                  <th className="text-left p-2 border">Price</th>
                  <th className="text-left p-2 border">SKU</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((sz) => {
                  const prod = prods.find(p => p.sizeName === sz);
                  const price = prod ? (prod.salePrice ?? prod.customerPrice ?? prod.piecePrice ?? null) : null;
                  const qty = prod ? (invBySku.get(prod.sku) ?? 0) : 0;
                  const sku = prod?.sku ?? "-";
                  return (
                    <tr key={`row-${color}-${sz}`} className="odd:bg-white/5">
                      <td className="p-2 border font-medium">{sz}</td>
                      <td className="p-2 border">{qty}</td>
                      <td className="p-2 border">{price != null ? price.toFixed(2) : "-"}</td>
                      <td className="p-2 border font-mono">{sku}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
