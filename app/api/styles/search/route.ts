// app/api/styles/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchStyles } from "@/lib/stylesRepo";

export const runtime = "nodejs";
export const revalidate = 0;

function fullImg(u?: string) {
  if (!u) return "";
  return u.startsWith("http") ? u : `https://www.ssactivewear.com/${u}`;
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const results = searchStyles(q, 50).map((r) => ({
    styleID: r.styleID,
    brandName: r.brandName,
    styleName: r.styleName,
    title: r.title || `${r.brandName} ${r.styleName}`,
    styleImage: fullImg(r.image || r.brandImage),
  }));
  return NextResponse.json({ results });
}
