import { NextResponse } from "next/server";
import { db, newId, type DeckRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const decks = db().prepare(`
    SELECT d.*,
           (SELECT COALESCE(SUM(quantity),0) FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone IN ('main','command')) AS cartes
    FROM decks d ORDER BY d.updated_at DESC
  `).all();
  return NextResponse.json(decks);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; format?: string; theme?: string };
  const nom = body.name?.trim();
  if (!nom) return NextResponse.json({ error: "Nom manquant" }, { status: 400 });

  const id = newId();
  const maintenant = new Date().toISOString();
  db().prepare(`
    INSERT INTO decks (id, name, format, description, theme, created_at, updated_at)
    VALUES (?, ?, ?, '', ?, ?, ?)
  `).run(id, nom, body.format ?? "commander", body.theme ?? "obsidian", maintenant, maintenant);

  return NextResponse.json(db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow,
                           { status: 201 });
}
