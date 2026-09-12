import { NextResponse } from "next/server";
import { db, newId, type DeckCardRow } from "@/lib/db";
import { parNoms } from "@/lib/scryfall";
import { lireListe } from "@/lib/decklist";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { texte?: string; remplacer?: boolean };
  if (!body.texte?.trim()) {
    return NextResponse.json({ error: "Liste vide" }, { status: 400 });
  }

  const { lignes, ignorees } = lireListe(body.texte);
  if (lignes.length === 0) {
    return NextResponse.json({ error: "Aucune ligne exploitable", ignorees }, { status: 400 });
  }

  const { trouvees, introuvables } = await parNoms([...new Set(lignes.map((l) => l.nom))]);

  const ecrire = db().transaction(() => {
    if (body.remplacer) db().prepare("DELETE FROM deck_cards WHERE deck_id = ?").run(id);

    const lire = db().prepare(
      "SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ? AND zone = ?");
    const inserer = db().prepare(`
      INSERT INTO deck_cards (id, deck_id, card_id, quantity, zone, category)
      VALUES (?, ?, ?, ?, ?, '')`);
    const majQte = db().prepare("UPDATE deck_cards SET quantity = ? WHERE id = ?");

    let ajoutees = 0;
    for (const l of lignes) {
      const carte = trouvees.get(l.nom.toLowerCase());
      if (!carte) continue;
      const existante = lire.get(id, carte.id, l.zone) as DeckCardRow | undefined;
      if (existante) majQte.run(existante.quantity + l.quantite, existante.id);
      else inserer.run(newId(), id, carte.id, l.quantite, l.zone);
      ajoutees += l.quantite;
    }
    db().prepare("UPDATE decks SET updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
    return ajoutees;
  });

  const ajoutees = ecrire();
  return NextResponse.json({ ajoutees, introuvables, ignorees });
}
