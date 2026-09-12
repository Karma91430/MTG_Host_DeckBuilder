import { NextResponse } from "next/server";
import { chercher, memoriser } from "@/lib/scryfall";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const q = (p.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ data: [], total_cards: 0 });

  try {
    const res = await chercher(q, Number(p.get("page") ?? 1));
    // Les resultats alimentent le cache : la carte ajoutee ensuite au deck
    // n'entrainera aucun appel reseau supplementaire.
    for (const c of res.data) memoriser(c);
    return NextResponse.json(res);
  } catch (err) {
    // Scryfall repond 404 quand aucune carte ne correspond : ce n'est pas une
    // panne, c'est une recherche vide.
    const message = err instanceof Error ? err.message : "Recherche impossible";
    if (/not find|aucun/i.test(message)) return NextResponse.json({ data: [], total_cards: 0 });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
