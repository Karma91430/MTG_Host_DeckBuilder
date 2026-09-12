import { NextResponse } from "next/server";
import { carte, impressions } from "@/lib/scryfall";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Toutes les impressions papier d'une carte, de la plus recente a la plus ancienne. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const c = await carte(id);
    return NextResponse.json({ nom: c.name, impressions: await impressions(c) });
  } catch {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
}
