import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Dossiers declares, unis a ceux effectivement utilises par des decks. */
export async function GET() {
  const declares = db().prepare("SELECT name FROM folders").all() as { name: string }[];
  const utilises = db().prepare(
    "SELECT DISTINCT folder AS name FROM decks WHERE folder != ''",
  ).all() as { name: string }[];
  const noms = [...new Set([...declares, ...utilises].map((f) => f.name))].sort();
  return NextResponse.json(noms);
}

export async function POST(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  const nom = name?.trim();
  if (!nom) return NextResponse.json({ error: "Nom manquant" }, { status: 400 });
  db().prepare("INSERT OR IGNORE INTO folders (name, created_at) VALUES (?, ?)")
      .run(nom, new Date().toISOString());
  return NextResponse.json({ ok: true, name: nom }, { status: 201 });
}

/** Supprime le dossier et sort les decks qu'il contenait. */
export async function DELETE(req: Request) {
  const nom = new URL(req.url).searchParams.get("name");
  if (!nom) return NextResponse.json({ error: "Nom manquant" }, { status: 400 });
  const vider = db().transaction(() => {
    db().prepare("DELETE FROM folders WHERE name = ?").run(nom);
    db().prepare("UPDATE decks SET folder = '' WHERE folder = ?").run(nom);
  });
  vider();
  return NextResponse.json({ ok: true });
}
