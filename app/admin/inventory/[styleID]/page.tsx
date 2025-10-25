// app/admin/inventory/[styleID]/page.tsx
import { fetchInventory } from "@/lib/ssApi";
import { getByStyleID } from "@/lib/stylesRepo";
import { getProductsByStyleID, listColorsForStyle, getSkuMapForStyle, ProductRow } from "@/lib/productsRepo";
import InventoryViewer from "@/components/InventoryViewer";


type RawInvRow = {
  sku: string;
  warehouses?: { qty?: number }[];
};

const prefer = (colors: string[], totals: Record<string, number>) => {
  const find = (name: string) => colors.find(c => c.toLowerCase() === name.toLowerCase());
  const white = find("white");
  const black = find("black");
  if (white && (totals[white] || 0) > 0) return white;
  if (black && (totals[black] || 0) > 0) return black;
  for (const c of colors) if ((totals[c] || 0) > 0) return c;
  if (white) return white;
  if (black) return black;
  return colors[0] || "Color";
};

export default async function Page(
  { params, searchParams }: {
    params: Promise<{ styleID: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const { styleID } = await params;
  const sp = (await searchParams) || {};
  const refresh = sp["refresh"] === "1" || sp["refresh"] === "true";

  const meta = getByStyleID(styleID);

  // Products.csv for this style
  const prodsAll = getProductsByStyleID(styleID).map<ProductRow>(p => ({
    ...p,
    // only keep the few fields the client needs
    salePrice: p.salePrice,
    customerPrice: p.customerPrice,
    piecePrice: p.piecePrice,
  }));
  const colors = listColorsForStyle(styleID);
  const skuMap = getSkuMapForStyle(styleID);

  // One S&S call per style page load (cached in-memory)
  const invRaw = await fetchInventory(styleID, { refresh }) as RawInvRow[];

  // Aggregate total qty per sku across warehouses
  const invBySku = new Map<string, number>();
  for (const r of invRaw || []) {
    const sum = (r.warehouses || []).reduce((a, w) => a + (w?.qty ?? 0), 0);
    invBySku.set(r.sku, (invBySku.get(r.sku) || 0) + sum);
  }

  // Build inventory rows joined to products by sku
  const inventory = Array.from(invBySku.entries()).map(([sku, totalQty]) => {
    const p = skuMap.get(sku);
    return { sku, totalQty, colorName: p?.colorName, sizeName: p?.sizeName };
  });

  // Totals per color to pick initial preferred color
  const totalsByColor: Record<string, number> = {};
  for (const it of inventory) {
    if (!it.colorName) continue;
    totalsByColor[it.colorName] = (totalsByColor[it.colorName] || 0) + (it.totalQty || 0);
  }
  const preferredColor = prefer(colors, totalsByColor);

  return (
    <InventoryViewer
      styleID={Number(styleID)}
      brandName={meta?.brandName || "Brand"}
      styleName={meta?.styleName || String(styleID)}
      title={meta?.title}
      products={prodsAll.map(p => ({
        sku: p.sku,
        colorName: p.colorName,
        colorSwatchImage: p.colorSwatchImage,
        colorOnModelFrontImage: p.colorOnModelFrontImage,
        colorFrontImage: p.colorFrontImage,
        sizeName: p.sizeName,
        salePrice: p.salePrice,
        customerPrice: p.customerPrice,
        piecePrice: p.piecePrice,
      }))}
      colors={colors}
      inventory={Array.from(invBySku.entries()).map(([sku, totalQty]) => ({ sku, totalQty }))}
      preferredColor={preferredColor}
    />
  );
}
