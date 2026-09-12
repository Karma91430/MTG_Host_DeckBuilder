/**
 * Chargement d'un deck complet, cartes resolues comprises.
 *
 * Trois pages en avaient besoin avec le meme enchainement -- lire les lignes,
 * grouper les identifiants, interroger le cache -- et la comparaison en
 * demande deux d'un coup. Module serveur : il touche la base.
 */

import { db, type DeckRow, type DeckCardRow } from "./db";
import { cartes } from "./scryfall";
import type { EntreeResolue } from "./deck";

export type DeckCharge = { deck: DeckRow; entrees: EntreeResolue[] };

export async function chargerDeck(id: string): Promise<DeckCharge | null> {
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) return null;

  const lignes = db().prepare("SELECT * FROM deck_cards WHERE deck_id = ?")
    .all(id) as DeckCardRow[];
  const donnees = await cartes(lignes.map((l) => l.card_id));
  const entrees: EntreeResolue[] = lignes
    .map((l) => ({ ...l, carte: donnees.get(l.card_id)! }))
    .filter((e) => e.carte);

  return { deck, entrees };
}

/** Liste courte des decks, pour les selecteurs. */
export function listerDecks() {
  return db().prepare(
    "SELECT id, name, format, theme FROM decks ORDER BY updated_at DESC",
  ).all() as { id: string; name: string; format: string; theme: string }[];
}
