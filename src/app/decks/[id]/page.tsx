import { notFound } from "next/navigation";
import { db, type DeckRow, type DeckCardRow } from "@/lib/db";
import { cartes } from "@/lib/scryfall";
import { statistiques, problemes, type EntreeResolue } from "@/lib/deck";
import ThemeShell from "@/components/ThemeShell";
import EditeurDeck from "@/components/EditeurDeck";

export const dynamic = "force-dynamic";

export default async function PageDeck({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) notFound();

  const lignes = db().prepare("SELECT * FROM deck_cards WHERE deck_id = ?")
    .all(id) as DeckCardRow[];

  // Une seule requete groupee pour toutes les cartes du deck, servie par le
  // cache local des qu'elles y sont.
  const donnees = await cartes(lignes.map((l) => l.card_id));
  const entrees: EntreeResolue[] = lignes
    .map((l) => ({ ...l, carte: donnees.get(l.card_id)! }))
    .filter((e) => e.carte);

  const commandant = entrees.find((e) => e.zone === "command")?.carte;
  const art = commandant?.image_uris?.art_crop
    ?? commandant?.card_faces?.[0]?.image_uris?.art_crop
    ?? null;

  return (
    <ThemeShell id={deck.theme} className="-mx-6 -my-8 min-h-screen bg-fond px-6 py-8">
      <EditeurDeck
        deck={{ id: deck.id, name: deck.name, format: deck.format,
                description: deck.description, theme: deck.theme,
                folder: deck.folder, tags: deck.tags }}
        entrees={entrees}
        stats={statistiques(entrees)}
        problemes={problemes(deck.format, entrees)}
        art={art}
      />
    </ThemeShell>
  );
}
