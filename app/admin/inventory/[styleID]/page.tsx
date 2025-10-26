// app/admin/inventory/[styleID]/page.tsx
import { fetchInventory } from "@/lib/ssApi";
import { getByStyleID } from "@/lib/stylesRepo";
import {
  getProductsByStyleID,
  listColorsForStyle,
  getSkuMapForStyle,
  type ProductRow,
} from "@/lib/productsRepo";
import InventoryViewer from "@/components/InventoryViewer";

type RawInvRow = { sku: string; warehouses?: { qty?: number }[] };

const preferColor = (colors: string[], totals: Record<string, number>) => {
  const lc = colors.map((x) => x.toLowerCase());
  const find = (n: string) => colors[lc.indexOf(n)] ?? undefined;
  const white = find("white");
  const black = find("black");
  if (white && (totals[white] ?? 0) > 0) return white;
  if (black && (totals[black] ?? 0) > 0) return black;
  for (const c of colors) if ((totals[c] ?? 0) > 0) return c;
  return colors[0] ?? "Color";
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ styleID: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;
  const styleID = Number(p.styleID);
  const refresh =
    (sp["refresh"] === "1" || sp["refresh"] === "true") ?? false;

  const meta = getByStyleID(styleID);

  // All Products.csv rows for this style (trim to the fields we actually use)
  const prodsAll = getProductsByStyleID(styleID).map((r) => ({
    sku: r.sku,
    styleID: r.styleID,
    brandName: r.brandName,
    styleName: r.styleName,
    colorName: r.colorName,
    color1: r.color1,
    sizeName: r.sizeName,
    sizeOrder: r.sizeOrder,
    salePrice: r.salePrice,
    customerPrice: r.customerPrice,
    piecePrice: r.piecePrice,
    colorOnModelFrontImage: r.colorOnModelFrontImage,
    colorOnModelSideImage: r.colorOnModelSideImage,
    colorOnModelBackImage: r.colorOnModelBackImage,
    colorFrontImage: r.colorFrontImage,
    colorSideImage: r.colorSideImage,
    colorBackImage: r.colorBackImage,
    colorDirectSideImage: r.colorDirectSideImage,
  })) as ProductRow[];

  const colors = listColorsForStyle(styleID);
  const skuMap = getSkuMapForStyle(styleID);

  // One S&S call per style page load (cached in fetchInventory)
  const invRaw = (await fetchInventory(styleID, { refresh })) as RawInvRow[];

  // aggregate total qty per SKU
  const qtyBySku = new Map<string, number>();
  for (const r of invRaw ?? []) {
    const total =
      (r.warehouses ?? []).reduce((acc, w) => acc + (w.qty ?? 0), 0) ?? 0;
    qtyBySku.set(r.sku, total);
  }

  // precompute totals per color to choose default color
  const totalsByColor: Record<string, number> = {};
  for (const [color, rows] of Object.entries(skuMap)) {
    let sum = 0;
    for (const r of rows) sum += qtyBySku.get(r.sku) ?? 0;
    totalsByColor[color] = sum;
  }
  const preferredColor = preferColor(colors, totalsByColor);

  // prepare inventory rows
  const inventory = Array.from(qtyBySku.entries()).map(([sku, totalQty]) => ({
    sku,
    totalQty,
  }));

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <a href="/admin/inventory" className="opacity-80 text-sm">
          ← Back
        </a>
        <a
          href={`/admin/inventory/${styleID}?refresh=1`}
          className="float-right text-xs opacity-80"
          title="Force re-fetch S&S (bypass cache)"
        >
          Refetch (bypass cache)
        </a>
      </div>

      <InventoryViewer
        styleID={styleID}
        brandName={meta?.brandName ?? prodsAll[0]?.brandName ?? ""}
        styleName={meta?.styleName ?? prodsAll[0]?.styleName ?? ""}
        title={meta?.title ?? ""}
        products={prodsAll}
        colors={colors}
        inventory={inventory}
        preferredColor={preferredColor}
      />
    </div>
  );
}
