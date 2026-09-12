/**
 * Type d'une carte et helpers purs.
 *
 * Ce module ne doit rien importer : il est charge par des composants clients,
 * et la moindre dependance vers la couche base de donnees ferait entrer un
 * module natif dans le bundle envoye au navigateur.
 */

export type Carte = {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: { small: string; normal: string; large: string; art_crop: string };
  card_faces?: { name: string; mana_cost?: string; oracle_text?: string; type_line?: string;
                 image_uris?: { small: string; normal: string; large: string; art_crop: string } }[];
  legalities: Record<string, string>;
  prices?: Record<string, string | null>;
  scryfall_uri: string;
};

/** Illustration d'une carte, y compris pour les cartes recto-verso. */
export function imageDe(c: Carte, taille: "small" | "normal" | "large" = "normal"): string | null {
  return c.image_uris?.[taille] ?? c.card_faces?.[0]?.image_uris?.[taille] ?? null;
}
