import { NextResponse } from "next/server";
import { db, newId, type DeckCardRow } from "@/lib/db";
import { memoriser } from "@/lib/historique";

export const dynamic = "force-dynamic";

type Contenu = { card_id: string; quantity: number; category: string }[];

/** Verse le contenu d'un paquet dans un deck, en cumulant les doublons. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { deckId } = (await req.json()) as { deckId?: string };
  if (!deckId) return NextResponse.json({ error: "Deck manquant" }, { status: 400 });

  const paquet = db().prepare("SELECT contenu FROM packages WHERE id = ?").get(id) as
    { contenu: string } | undefined;
  if (!paquet) return NextResponse.json({ error: "Paquet introuvable" }, { status: 404 });

  memoriser(deckId);

  const contenu = JSON.parse(paquet.contenu) as Contenu;
  const lire = db().prepare(
    "SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ? AND zone = 'main'");
  const inserer = db().prepare(`
    INSERT INTO deck_cards (id, deck_id, card_id, quantity, zone, category, owned)
    VALUES (?, ?, ?, ?, 'main', ?, 'none')`);
  const majQte = db().prepare("UPDATE deck_cards SET quantity = ? WHERE id = ?");

  const verser = db().transaction(() => {
    for (const c of contenu) {
      const existante = lire.get(deckId, c.card_id) as DeckCardRow | undefined;
      if (existante) majQte.run(existante.quantity + c.quantity, existante.id);
      else inserer.run(newId(), deckId, c.card_id, c.quantity, c.category);
    }
    db().prepare("UPDATE decks SET updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), deckId);
  });
  verser();

  return NextResponse.json({ ajoutees: contenu.reduce((s, c) => s + c.quantity, 0) });
}
