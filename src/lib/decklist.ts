/**
 * Lecture et ecriture de listes de decks au format texte.
 *
 * Le format « 1 Sol Ring » est le plus repandu : Archidekt, Moxfield, MTGO et
 * Arena l'exportent tous, avec des variantes qu'on absorbe ici.
 */

export type LigneListe = { quantite: number; nom: string; zone: string };

const ENTETES: Record<string, string> = {
  commander: "command", commandant: "command",
  sideboard: "side", reserve: "side",
  maybeboard: "maybe", considering: "maybe",
  deck: "main", mainboard: "main", main: "main",
};

export function lireListe(texte: string): { lignes: LigneListe[]; ignorees: string[] } {
  const lignes: LigneListe[] = [];
  const ignorees: string[] = [];
  let zone = "main";

  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.trim();
    if (!ligne || ligne.startsWith("//") || ligne.startsWith("#")) continue;

    // Un intitule seul change la zone courante : « Commander », « Sideboard ».
    const entete = ENTETES[ligne.toLowerCase().replace(/[:\s]+$/, "")];
    if (entete) { zone = entete; continue; }

    // « 2x Lightning Bolt (m10) 146 *F* » -> quantite 2, nom « Lightning Bolt ».
    const m = ligne.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    if (!m) { ignorees.push(ligne); continue; }

    const nom = m[2]
      .replace(/\s*\([^)]*\)\s*\d*/g, "")   // edition et numero de collecteur
      .replace(/\s*\*[^*]*\*\s*/g, "")      // marqueurs de finition
      .replace(/\s+/g, " ")
      .trim();
    if (!nom) { ignorees.push(ligne); continue; }
    lignes.push({ quantite: Number(m[1]), nom, zone });
  }
  return { lignes, ignorees };
}

export function ecrireListe(
  groupes: { zone: string; cartes: { quantite: number; nom: string }[] }[],
): string {
  const titres: Record<string, string> = {
    command: "Commander", main: "Deck", side: "Sideboard", maybe: "Maybeboard",
  };
  return groupes
    .filter((g) => g.cartes.length > 0)
    .map((g) => [
      titres[g.zone] ?? g.zone,
      ...g.cartes.map((c) => `${c.quantite} ${c.nom}`),
    ].join("\n"))
    .join("\n\n");
}
