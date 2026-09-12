import { NextResponse } from "next/server";
import { db, newId } from "@/lib/db";
import { memoriser } from "@/lib/historique";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

function toucher(deckId: string) {
  db().prepare("UPDATE decks SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), deckId);
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
    { entryId?: string; quantity?: number; zone?: string; category?: string; owned?: string };
  if (!body.entryId) return NextResponse.json({ error: "Entree manquante" }, { status: 400 });

  memoriser(id);

  if (body.quantity !== undefined && body.quantity <= 0) {
    db().prepare("DELETE FROM deck_cards WHERE id = ? AND deck_id = ?").run(body.entryId, id);
    toucher(id);
    return NextResponse.json({ ok: true, supprimee: true });
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
