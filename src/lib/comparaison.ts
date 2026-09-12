/**
 * Comparaison de deux decks.
 *
 * Tout se calcule localement, a partir de ce qui est deja en cache : aucun
 * appel supplementaire. Le but n'est pas de designer un vainqueur mais de
 * rendre lisible ce qui separe deux listes -- ou deux etats d'une meme liste.
 */

import type { Carte } from "./carte";
import type { EntreeResolue, Stats } from "./deck";
import { categorieType } from "./deck";
import { analyserMana, COULEURS } from "./mana";

export type LigneCarte = {
  id: string;
  nom: string;
  image: string | null;
  cmc: number;
  type: string;
  quantiteA: number;
  quantiteB: number;
};

export type EcartChiffre = {
  nom: string;
  a: number;
  b: number;
  /** Unite affichee apres la valeur, vide s'il n'y en a pas. */
  unite: string;
  /** true quand une valeur haute est plutot un atout. */
  hautEstMieux: boolean;
};

export type Comparaison = {
  communes: LigneCarte[];
  propresA: LigneCarte[];
  propresB: LigneCarte[];
  /** Part de cartes partagees, sur l'union des deux listes. */
  recouvrement: number;
  courbe: { cout: number; a: number; b: number }[];
  couleurs: { code: string; a: number; b: number }[];
  chiffres: EcartChiffre[];
};

const image = (c: Carte) =>
  c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null;

/** Cartes jouees d'un deck, indexees par nom : le nom identifie mieux qu'un
 *  identifiant de tirage, deux decks pouvant jouer deux impressions differentes
 *  de la meme carte. */
function indexer(entrees: EntreeResolue[]): Map<string, EntreeResolue> {
  const m = new Map<string, EntreeResolue>();
  for (const e of entrees) {
    if (e.zone !== "main" && e.zone !== "command") continue;
    const cle = e.carte.name.toLowerCase();
    const deja = m.get(cle);
    if (deja) deja.quantity += e.quantity;
    else m.set(cle, { ...e });
  }
  return m;
}

export function comparer(
  a: { entrees: EntreeResolue[]; stats: Stats },
  b: { entrees: EntreeResolue[]; stats: Stats },
): Comparaison {
  const ia = indexer(a.entrees);
  const ib = indexer(b.entrees);

  const communes: LigneCarte[] = [];
  const propresA: LigneCarte[] = [];
  const propresB: LigneCarte[] = [];

  const ligne = (e: EntreeResolue, qa: number, qb: number): LigneCarte => ({
    id: e.carte.id,
    nom: e.carte.name,
    image: image(e.carte),
    cmc: e.carte.cmc ?? 0,
    type: categorieType(e.carte),
    quantiteA: qa,
    quantiteB: qb,
  });

  for (const [cle, e] of ia) {
    const autre = ib.get(cle);
    if (autre) communes.push(ligne(e, e.quantity, autre.quantity));
    else propresA.push(ligne(e, e.quantity, 0));
  }
  for (const [cle, e] of ib) {
    if (!ia.has(cle)) propresB.push(ligne(e, 0, e.quantity));
  }

  const tri = (x: LigneCarte, y: LigneCarte) =>
    x.cmc - y.cmc || x.nom.localeCompare(y.nom);
  communes.sort(tri); propresA.sort(tri); propresB.sort(tri);

  const union = communes.length + propresA.length + propresB.length;
  const recouvrement = union === 0 ? 0 : Math.round((communes.length / union) * 100);

  const courbe = a.stats.courbe.map((c, i) => ({
    cout: c.cout, a: c.n, b: b.stats.courbe[i]?.n ?? 0,
  }));

  const manaA = analyserMana(a.entrees);
  const manaB = analyserMana(b.entrees);
  const couleurs = COULEURS
    .map((code) => ({
      code,
      a: manaA.lignes.find((l) => l.code === code)?.pips ?? 0,
      b: manaB.lignes.find((l) => l.code === code)?.pips ?? 0,
    }))
    .filter((l) => l.a > 0 || l.b > 0);

  const chiffres: EcartChiffre[] = [
    { nom: "Cartes", a: a.stats.total, b: b.stats.total, unite: "", hautEstMieux: false },
    { nom: "Cout moyen", a: a.stats.moyenneCmc, b: b.stats.moyenneCmc, unite: "", hautEstMieux: false },
    { nom: "Terrains", a: manaA.terrains, b: manaB.terrains, unite: "", hautEstMieux: false },
    { nom: "Sources hors terrain", a: manaA.rampeNonTerrain, b: manaB.rampeNonTerrain,
      unite: "", hautEstMieux: true },
    { nom: "Valeur", a: a.stats.prix, b: b.stats.prix, unite: " €", hautEstMieux: false },
  ];

  return { communes, propresA, propresB, recouvrement, courbe, couleurs, chiffres };
}
