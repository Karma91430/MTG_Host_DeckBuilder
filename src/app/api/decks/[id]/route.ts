import { NextResponse } from "next/server";
import { db, type DeckRow } from "@/lib/db";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const cartes = db().prepare("SELECT * FROM deck_cards WHERE deck_id = ?").all(id);
  return NextResponse.json({ deck, cartes });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as
    { name?: string; format?: string; description?: string; theme?: string;
      folder?: string; tags?: string };
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  db().prepare(`
    UPDATE decks SET name = ?, format = ?, description = ?, theme = ?,
                     folder = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.name?.trim() || deck.name,
    body.format ?? deck.format,
    body.description ?? deck.description,
    body.theme ?? deck.theme,
    body.folder ?? deck.folder,
    body.tags ?? deck.tags,
    new Date().toISOString(), id,
  );
  return NextResponse.json(db().prepare("SELECT * FROM decks WHERE id = ?").get(id));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  db().prepare("DELETE FROM decks WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
