import { NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { memoriser } from "@/lib/historique";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

function toucher(deckId: string) {
  db().prepare("UPDATE decks SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), deckId);
}

/**
 * Retire une carte des autres zones du deck.
 *
 * La comparaison porte sur le nom et non sur l'identifiant : deux impressions
 * d'une meme carte sont deux identifiants differents, et sans cela un
 * commandant reapparaitrait dans le deck des qu'on lui choisit une autre
 * edition -- il serait alors compte deux fois dans les statistiques.
 */
function libererLesAutresZones(deckId: string, cardId: string, zone: string) {
  db().prepare(`
    DELETE FROM deck_cards
    WHERE deck_id = ? AND zone != ? AND card_id IN (
      SELECT id FROM card_cache WHERE json_extract(payload, '$.name') =
        (SELECT json_extract(payload, '$.name') FROM card_cache WHERE id = ?)
    )
  `).run(deckId, zone, cardId);
}

/** Ajoute une carte, ou incremente sa quantite si elle est deja dans la zone. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as
    { cardId?: string; quantity?: number; zone?: string; category?: string };
  if (!body.cardId) return NextResponse.json({ error: "Carte manquante" }, { status: 400 });

  memoriser(id);

  const zone = body.zone ?? "main";
  const qte = body.quantity ?? 1;

  // Une carte appartient a une seule zone : sans cette regle, un commandant
  // ajoute ensuite au deck apparaissait dans deux sections et etait compte
  // deux fois dans les statistiques.
  libererLesAutresZones(id, body.cardId, zone);
  const existante = db().prepare(
    "SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ? AND zone = ?",
  ).get(id, body.cardId, zone) as { id: string; quantity: number } | undefined;

  if (existante) {
    db().prepare("UPDATE deck_cards SET quantity = ? WHERE id = ?")
        .run(existante.quantity + qte, existante.id);
  } else {
    db().prepare(`
      INSERT INTO deck_cards (id, deck_id, card_id, quantity, zone, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId(), id, body.cardId, qte, zone, body.category ?? "");
  }
  toucher(id);
  return NextResponse.json({ ok: true });
}

/** Change quantite, zone ou categorie. Une quantite nulle retire la carte. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as
    { entryId?: string; quantity?: number; zone?: string; category?: string;
      owned?: string; cardId?: string };
  if (!body.entryId) return NextResponse.json({ error: "Entree manquante" }, { status: 400 });

  memoriser(id);

  // Changer d'impression revient a changer d'identifiant de carte. Si le
  // tirage vise est deja present dans la meme zone, les deux entrees
  // fusionnent plutot que de heurter la contrainte d'unicite.
  if (body.cardId !== undefined) {
    const courante = db().prepare("SELECT * FROM deck_cards WHERE id = ? AND deck_id = ?")
      .get(body.entryId, id) as
      { card_id: string; quantity: number; zone: string } | undefined;
    if (!courante) return NextResponse.json({ error: "Entree introuvable" }, { status: 404 });

    if (courante.card_id !== body.cardId) {
      const cible = db().prepare(
        "SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ? AND zone = ? AND id != ?",
      ).get(id, body.cardId, courante.zone, body.entryId) as
        { id: string; quantity: number } | undefined;
      if (cible) {
        db().prepare("UPDATE deck_cards SET quantity = ? WHERE id = ?")
            .run(cible.quantity + courante.quantity, cible.id);
        db().prepare("DELETE FROM deck_cards WHERE id = ?").run(body.entryId);
        toucher(id);
        return NextResponse.json({ ok: true, fusionnee: true });
      }
      db().prepare("UPDATE deck_cards SET card_id = ? WHERE id = ? AND deck_id = ?")
          .run(body.cardId, body.entryId, id);
      libererLesAutresZones(id, body.cardId, courante.zone);
      toucher(id);
    }
  }

  if (body.quantity !== undefined && body.quantity <= 0) {
    db().prepare("DELETE FROM deck_cards WHERE id = ? AND deck_id = ?").run(body.entryId, id);
    toucher(id);
    return NextResponse.json({ ok: true, supprimee: true });
  }

  // Changer de zone peut heurter une entree existante dans la zone visee :
  // on fusionne les quantites plutot que de violer la contrainte d'unicite.
  if (body.zone !== undefined) {
    const courante = db().prepare("SELECT * FROM deck_cards WHERE id = ? AND deck_id = ?")
      .get(body.entryId, id) as { card_id: string; quantity: number } | undefined;
    if (courante) {
      const cible = db().prepare(
        "SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ? AND zone = ? AND id != ?",
      ).get(id, courante.card_id, body.zone, body.entryId) as
        { id: string; quantity: number } | undefined;
      if (cible) {
        db().prepare("UPDATE deck_cards SET quantity = ? WHERE id = ?")
            .run(cible.quantity + courante.quantity, cible.id);
        db().prepare("DELETE FROM deck_cards WHERE id = ?").run(body.entryId);
        toucher(id);
        return NextResponse.json({ ok: true, fusionnee: true });
      }
    }
  }

  const champs: string[] = [];
  const args: unknown[] = [];
  if (body.quantity !== undefined) { champs.push("quantity = ?"); args.push(body.quantity); }
  if (body.zone !== undefined) { champs.push("zone = ?"); args.push(body.zone); }
  if (body.category !== undefined) { champs.push("category = ?"); args.push(body.category); }
  if (body.owned !== undefined) { champs.push("owned = ?"); args.push(body.owned); }
  if (champs.length === 0) return NextResponse.json({ ok: true });

  db().prepare(`UPDATE deck_cards SET ${champs.join(", ")} WHERE id = ? AND deck_id = ?`)
      .run(...args, body.entryId, id);
  toucher(id);
  return NextResponse.json({ ok: true });
}
