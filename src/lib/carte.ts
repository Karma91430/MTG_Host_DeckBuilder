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
  /** Couleurs de mana que la carte peut produire, terrains et rampe compris. */
  produced_mana?: string[];
  /** Pieces liees : jetons crees, faces melees, cartes compagnons. */
  all_parts?: { id: string; component: string; name: string; type_line?: string }[];
  prices?: Record<string, string | null>;
  scryfall_uri: string;

  /** Rang de popularite en Commander. Plus il est bas, plus la carte est jouee. */
  edhrec_rank?: number;
  /** Adresse Scryfall listant toutes les impressions de la carte. */
  prints_search_uri?: string;

  // Ce qui distingue une impression d'une autre, pour le selecteur d'edition.
  collector_number?: string;
  released_at?: string;
  promo?: boolean;
  digital?: boolean;
  frame_effects?: string[];
  border_color?: string;
  lang?: string;
};

/** Une impression precise d'une carte, telle que la presente le selecteur. */
export type Impression = {
  id: string;
  set: string;
  set_name: string;
  collector_number: string;
  released_at: string;
  image: string | null;
  prix: string | null;
  promo: boolean;
  effets: string[];
};

/** Illustration d'une carte, y compris pour les cartes recto-verso. */
export function imageDe(c: Carte, taille: "small" | "normal" | "large" = "normal"): string | null {
  return c.image_uris?.[taille] ?? c.card_faces?.[0]?.image_uris?.[taille] ?? null;
}
