import type { Carte } from "./carte";
import type { EntreeResolue } from "./deck";

/**
 * Analyse du mana d'un deck : ce qu'il coute, et ce qu'il produit.
 *
 * Deux grandeurs distinctes, souvent confondues. Les symboles colores dans les
 * couts disent la demande ; les cartes qui produisent du mana disent l'offre.
 * Un deck dont la demande en vert depasse largement ses sources vertes se
 * bloquera, quel que soit son nombre total de terrains.
 */

export const COULEURS = ["W", "U", "B", "R", "G", "C"] as const;
export type CouleurMana = (typeof COULEURS)[number];

export const NOMS: Record<string, string> = {
  W: "Blanc", U: "Bleu", B: "Noir", R: "Rouge", G: "Vert", C: "Incolore",
};

/** Symboles officiels, servis par Scryfall. */
export const symboleMana = (code: string) =>
  `https://svgs.scryfall.io/card-symbols/${code}.svg`;

/**
 * Compte les symboles colores d'un cout.
 *
 * Un symbole hybride comme {W/U} compte pour chacune de ses couleurs : il
 * peut etre paye de deux facons, et les deux sources sont donc pertinentes.
 */
export function pipsDuCout(cout: string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!cout) return out;
  for (const bloc of cout.match(/\{[^}]+\}/g) ?? []) {
    for (const lettre of bloc.slice(1, -1).split("/")) {
      if ((COULEURS as readonly string[]).includes(lettre)) {
        out[lettre] = (out[lettre] ?? 0) + 1;
      }
    }
  }
  return out;
}

/** Cout complet d'une carte, faces comprises. */
function coutDe(c: Carte): string {
  return c.mana_cost || (c.card_faces ?? []).map((f) => f.mana_cost ?? "").join("");
}

export type LigneMana = {
  code: string; nom: string;
  pips: number;       // symboles colores reclames par les couts
  sources: number;    // cartes capables de produire cette couleur
};

export type AnalyseMana = {
  lignes: LigneMana[];
  totalPips: number;
  totalSources: number;
  terrains: number;
  rampeNonTerrain: number;
};

export function analyserMana(entrees: EntreeResolue[]): AnalyseMana {
  const retenues = entrees.filter((e) => e.zone === "main" || e.zone === "command");

  const pips: Record<string, number> = {};
  const sources: Record<string, number> = {};
  let terrains = 0;
  let rampeNonTerrain = 0;

  for (const e of retenues) {
    for (const [couleur, n] of Object.entries(pipsDuCout(coutDe(e.carte)))) {
      pips[couleur] = (pips[couleur] ?? 0) + n * e.quantity;
    }

    const produit = e.carte.produced_mana ?? [];
    if (produit.length > 0) {
      const estTerrain = /land/i.test(e.carte.type_line ?? "");
      if (estTerrain) terrains += e.quantity;
      else rampeNonTerrain += e.quantity;
      for (const couleur of produit) {
        sources[couleur] = (sources[couleur] ?? 0) + e.quantity;
      }
    }
  }

  const lignes = COULEURS
    .map((code) => ({ code, nom: NOMS[code], pips: pips[code] ?? 0, sources: sources[code] ?? 0 }))
    .filter((l) => l.pips > 0 || l.sources > 0);

  return {
    lignes,
    totalPips: lignes.reduce((s, l) => s + l.pips, 0),
    totalSources: terrains + rampeNonTerrain,
    terrains,
    rampeNonTerrain,
  };
}
