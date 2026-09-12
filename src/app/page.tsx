import { db } from "@/lib/db";
import { cartes, imageDe } from "@/lib/scryfall";
import ListeDecks, { type LigneDeck } from "@/components/ListeDecks";

export const dynamic = "force-dynamic";

type Ligne = Omit<LigneDeck, "art" | "commandant"> & { commandantId: string | null };

export default async function Accueil() {
  const decks = db().prepare(`
    SELECT d.id, d.name, d.format, d.theme, d.folder, d.tags, d.updated_at,
           (SELECT COALESCE(SUM(quantity),0) FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone IN ('main','command')) AS cartes,
           (SELECT c.card_id FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone = 'command' LIMIT 1) AS commandantId
    FROM decks d ORDER BY d.updated_at DESC
  `).all() as Ligne[];

  // L'illustration du commandant sert de visuel au deck : une seule requete
  // groupee, servie par le cache des que les cartes y sont.
  const visuels = await cartes(decks.map((d) => d.commandantId).filter(Boolean) as string[]);

  const lignes: LigneDeck[] = decks.map((d) => {
    const carte = d.commandantId ? visuels.get(d.commandantId) : undefined;
    return {
      ...d,
      commandant: carte?.name ?? null,
      art: carte?.image_uris?.art_crop
        ?? carte?.card_faces?.[0]?.image_uris?.art_crop
        ?? imageDe(carte ?? ({} as never), "normal")
        ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes decks</h1>
        <p className="text-sm text-attenue">
          {decks.length} deck{decks.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* La liste s'affiche meme a vide : elle porte les boutons de creation. */}
      <ListeDecks decks={lignes} />
    </div>
  );
}
