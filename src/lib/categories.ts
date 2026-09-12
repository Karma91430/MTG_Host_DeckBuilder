/**
 * Categories de construction et lecture des sous-types.
 *
 * Module sans dependance : il est charge cote navigateur comme cote serveur.
 */

import type { Carte } from "./carte";

/** Roles habituels d'une carte dans un deck, proposes a la saisie. */
export const CATEGORIES = [
  "Rampe", "Fixation", "Pioche", "Tuteur", "Removal cible", "Removal de masse",
  "Protection", "Finisher", "Combo", "Recursion", "Terrains", "Utilitaire",
] as const;

/**
 * Motifs de texte revelateurs d'un role, essayes dans l'ordre.
 *
 * L'ordre compte : une carte qui cherche un terrain est de la rampe, meme si
 * son texte contient aussi « draw a card ».
 */
const INDICES: { categorie: string; motif: RegExp }[] = [
  { categorie: "Terrains", motif: /^$/ }, // traite a part, par le type
  { categorie: "Rampe", motif: /search your library for (a|up to \w+) (basic )?\w* ?land|add \{[wubrgc]\}|adds? an additional/i },
  { categorie: "Tuteur", motif: /search your library for a card/i },
  { categorie: "Removal de masse", motif: /destroy all|exile all|each creature gets|all creatures get/i },
  { categorie: "Removal cible", motif: /destroy target|exile target|target creature gets -|counter target/i },
  { categorie: "Pioche", motif: /draw (a card|\w+ cards)|look at the top/i },
  { categorie: "Protection", motif: /hexproof|indestructible|protection from|can't be countered|shroud/i },
  { categorie: "Recursion", motif: /return .* from your graveyard/i },
];

/** Categorie deduite du texte de la carte, ou chaine vide si rien ne ressort. */
export function categorieSuggeree(c: Carte): string {
  const type = (c.type_line || "").toLowerCase();
  if (type.includes("land")) return "Terrains";

  const texte = c.oracle_text ?? c.card_faces?.map((f) => f.oracle_text ?? "").join(" ") ?? "";
  if (!texte) return "";
  for (const { categorie, motif } of INDICES) {
    if (categorie !== "Terrains" && motif.test(texte)) return categorie;
  }
  return "";
}

/**
 * Sous-types d'une carte : ce qui suit le tiret cadratin dans la ligne de type.
 *
 * « Legendary Creature — Elf Druid » donne Elf et Druid. Les cartes a deux
 * faces exposent une ligne par face, separee par « // ».
 */
export function sousTypes(c: Carte): string[] {
  const lignes = [c.type_line ?? "", ...(c.card_faces ?? []).map((f) => f.type_line ?? "")];
  const out = new Set<string>();
  for (const ligne of lignes) {
    for (const partie of ligne.split("//")) {
      const apres = partie.split(/[—–-]/)[1];
      if (!apres) continue;
      for (const mot of apres.trim().split(/\s+/)) {
        if (mot.length > 1) out.add(mot);
      }
    }
  }
  return [...out];
}

/** Types principaux, a gauche du tiret. */
export function typesPrincipaux(c: Carte): string[] {
  const gauche = (c.type_line ?? "").split(/[—–-]/)[0] ?? "";
  return gauche.trim().split(/\s+/).filter((m) => m.length > 1);
}
