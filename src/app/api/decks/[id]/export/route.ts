import { db, type DeckCardRow, type DeckRow } from "@/lib/db";
import { cartes } from "@/lib/scryfall";
import { ecrireListe } from "@/lib/decklist";

export const dynamic = "force-dynamic";

const ORDRE_ZONES = ["command", "main", "side", "maybe"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) return new Response("Introuvable", { status: 404 });

  const lignes = db().prepare("SELECT * FROM deck_cards WHERE deck_id = ?")
    .all(id) as DeckCardRow[];
  const donnees = await cartes(lignes.map((l) => l.card_id));

  const groupes = ORDRE_ZONES.map((zone) => ({
    zone,
    cartes: lignes
      .filter((l) => l.zone === zone)
      .map((l) => ({ quantite: l.quantity, nom: donnees.get(l.card_id)?.name ?? "" }))
      .filter((c) => c.nom)
      .sort((a, b) => a.nom.localeCompare(b.nom)),
  }));

  const nomFichier = deck.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  return new Response(ecrireListe(groupes), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier || "deck"}.txt"`,
    },
  });
}
