// app/api/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchInventory } from "@/lib/ssApi";

export async function GET(req: NextRequest) {
  const styleID = req.nextUrl.searchParams.get("style");
  if (!styleID) {
    return NextResponse.json({ error: "Missing ?style=" }, { status: 400 });
  }
  try {
    const data = await fetchInventory(styleID);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Fetch failed" }, { status: 500 });
  }
}
