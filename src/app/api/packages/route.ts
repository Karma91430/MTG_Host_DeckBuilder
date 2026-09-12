import { NextResponse } from "next/server";
import { db, newId, type DeckCardRow } from "@/lib/db";

export const dynamic = "force-dynamic";

type Contenu = { card_id: string; quantity: number; category: string }[];

export async function GET() {
  const lignes = db().prepare("SELECT * FROM packages ORDER BY name").all() as
    { id: string; name: string; contenu: string; created_at: string }[];
  return NextResponse.json(lignes.map((p) => ({
    id: p.id, name: p.name, created_at: p.created_at,
    cartes: (JSON.parse(p.contenu) as Contenu).reduce((s, c) => s + c.quantity, 0),
  })));
}

/**
 * Cree un paquet a partir d'un deck.
 *
 * Sans categorie precisee, tout le deck est repris ; avec, seules les cartes
 * de cette categorie -- c'est ainsi qu'on isole un socle de rampe reutilisable.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; deckId?: string; categorie?: string };
  if (!body.name?.trim() || !body.deckId) {
    return NextResponse.json({ error: "Nom ou deck manquant" }, { status: 400 });
  }

  const lignes = db().prepare(
    "SELECT * FROM deck_cards WHERE deck_id = ? AND zone = 'main'",
  ).all(body.deckId) as DeckCardRow[];

  const retenues = body.categorie
    ? lignes.filter((l) => l.category === body.categorie)
    : lignes;
  if (retenues.length === 0) {
    return NextResponse.json({ error: "Aucune carte a enregistrer" }, { status: 400 });
  }

  const id = newId();
  const contenu: Contenu = retenues.map((l) => ({
    card_id: l.card_id, quantity: l.quantity, category: l.category,
  }));
  db().prepare(
    "INSERT INTO packages (id, name, contenu, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, body.name.trim(), JSON.stringify(contenu), new Date().toISOString());

  return NextResponse.json({ id, name: body.name.trim(), cartes: contenu.length }, { status: 201 });
}
