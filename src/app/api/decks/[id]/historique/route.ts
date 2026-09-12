import { NextResponse } from "next/server";
import { annuler, retablir, etatHistorique } from "@/lib/historique";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json(etatHistorique(id));
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { action } = (await req.json()) as { action?: string };
  const fait = action === "retablir" ? retablir(id) : annuler(id);
  return NextResponse.json({ fait, ...etatHistorique(id) });
}
