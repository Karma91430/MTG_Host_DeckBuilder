/**
 * Estimation de puissance d'un deck.
 *
 * Le resultat est une indication, pas un verdict : la puissance depend aussi
 * de la table et du pilote. On s'en tient donc a des signaux mesurables, on
 * montre la contribution de chacun, et on evite de trancher plus finement que
 * ce que les donnees permettent.
 *
 * Aucune base de combos n'est utilisee : elle demanderait une dependance
 * externe a maintenir. Ce que l'on mesure, c'est la vitesse, l'interaction et
 * la densite de cartes de reference.
 */

import type { Carte } from "./carte";
import type { EntreeResolue } from "./deck";
import { categorieType } from "./deck";
import { profilDuDeck } from "./suggestions";

/**
 * Mana rapide reconnu par son nom.
 *
 * Liste courte et stable, de cartes dont la presence change a elle seule le
 * rythme d'une partie. Ce n'est pas une base de combos : aucune interaction
 * n'y est decrite, seulement l'acceleration.
 */
const MANA_RAPIDE = new Set([
  "sol ring", "mana crypt", "mana vault", "chrome mox", "mox diamond", "mox opal",
  "mox amber", "jeweled lotus", "lotus petal", "black lotus", "ancient tomb",
  "grim monolith", "dark ritual", "cabal ritual", "rite of flame", "simian spirit guide",
  "elvish mystic", "llanowar elves", "birds of paradise", "deathrite shaman",
  "carpet of flowers", "priest of titania", "ragavan, nimble pilferer",
  "city of traders", "gaea's cradle", "serra's sanctum", "tolarian academy",
]);

const MOTIFS = {
  tuteur: /search your library for a card/i,
  gratuit: /without paying its mana cost|costs \{?\d?\}? less to cast/i,
  contre: /counter target (spell|ability)/i,
  removal: /destroy target|exile target|destroy all|exile all|target creature gets -/i,
  protection: /hexproof|indestructible|protection from|can't be countered/i,
};

export type Axe = {
  nom: string;
  /** Ce que le deck affiche, en clair. */
  mesure: string;
  /** Part de ce signal dans la note, de 0 a 1. */
  part: number;
  commentaire: string;
};

export type Puissance = {
  /** Note de 1 a 10. */
  note: number;
  palier: string;
  resume: string;
  axes: Axe[];
};

const PALIERS: { max: number; nom: string; resume: string }[] = [
  { max: 3.5, nom: "Detente",
    resume: "Un deck de decouverte : peu d acceleration, peu d interaction. Il tiendra la table face a des precons." },
  { max: 5.5, nom: "Milieu de table",
    resume: "Rythme et interaction corrects. C est le terrain de jeu le plus courant en Commander." },
  { max: 7.5, nom: "Optimise",
    resume: "Acceleration nette, interaction dense, cartes de reference. Il prend l avantage sur un deck de table." },
  { max: 9.0, nom: "Haute puissance",
    resume: "Mana rapide, tuteurs et sorts gratuits : le deck cherche a conclure vite et sait se defendre." },
  { max: 10.1, nom: "Competitif",
    resume: "Profil competitif : tout y est tourne vers la vitesse et le controle du tour adverse." },
];

/** Interpolation bornee : ramene une mesure sur une echelle de 0 a 1. */
function echelle(valeur: number, bas: number, haut: number): number {
  if (haut === bas) return 0;
  return Math.max(0, Math.min(1, (valeur - bas) / (haut - bas)));
}

const texteDe = (c: Carte) =>
  c.oracle_text ?? (c.card_faces ?? []).map((f) => f.oracle_text ?? "").join(" ") ?? "";

export function estimerPuissance(entrees: EntreeResolue[], format: string): Puissance | null {
  const jouees = entrees.filter((e) => e.zone === "main" || e.zone === "command");
  const taille = jouees.reduce((s, e) => s + e.quantity, 0);
  // En dessous de ce seuil, la mesure dirait surtout que le deck n est pas
  // fini. Un Commander se juge plus tard qu un deck a soixante cartes.
  const minimum = format === "commander" || format === "brawl" ? 45 : 30;
  if (taille < minimum) return null;

  const { roles } = profilDuDeck(entrees);

  let manaRapide = 0;
  let tuteurs = 0;
  let gratuits = 0;
  let contres = 0;
  let removal = 0;
  let protection = 0;
  let sommeCmc = 0;
  let sorts = 0;
  let prix = 0;

  for (const e of jouees) {
    const c = e.carte;
    const texte = texteDe(c);
    const q = e.quantity;

    if (MANA_RAPIDE.has(c.name.toLowerCase())) manaRapide += q;
    if (MOTIFS.tuteur.test(texte)) tuteurs += q;
    if (MOTIFS.gratuit.test(texte)) gratuits += q;
    if (MOTIFS.contre.test(texte)) contres += q;
    if (MOTIFS.removal.test(texte)) removal += q;
    if (MOTIFS.protection.test(texte)) protection += q;

    if (categorieType(c) !== "Terrains") {
      sommeCmc += (c.cmc ?? 0) * q;
      sorts += q;
    }
    const p = Number(c.prices?.eur ?? c.prices?.usd ?? 0);
    if (Number.isFinite(p)) prix += p * q;
  }

  const moyenneCmc = sorts > 0 ? sommeCmc / sorts : 0;
  // Tout est ramene a une taille de reference pour qu un deck a moitie
  // construit ne soit pas juge sur des comptes absolus.
  const parCent = (n: number) => (n / taille) * 100;
  const prixMoyen = prix / Math.max(1, taille);

  const signaux: { nom: string; score: number; poids: number; mesure: string; commentaire: string }[] = [
    {
      nom: "Acceleration",
      score: echelle(parCent(manaRapide + roles.rampe), 6, 26),
      poids: 0.26,
      mesure: `${manaRapide + roles.rampe} carte${manaRapide + roles.rampe > 1 ? "s" : ""}`
        + (manaRapide > 0 ? `, dont ${manaRapide} de mana rapide` : ""),
      commentaire: manaRapide > 0
        ? "Le mana rapide avance le deck d un tour entier ; c est le signal de vitesse le plus net."
        : "Rampe ordinaire, sans mana rapide : le deck demarre au rythme de la table.",
    },
    {
      nom: "Cout moyen",
      score: echelle(4.2 - moyenneCmc, 0.4, 1.9),
      poids: 0.18,
      mesure: moyenneCmc.toFixed(2),
      commentaire: moyenneCmc < 2.6
        ? "Courbe basse : le deck deploie plusieurs sorts par tour."
        : moyenneCmc < 3.4
        ? "Courbe equilibree, ni lente ni explosive."
        : "Courbe haute : il faut survivre jusqu a pouvoir jouer ses cartes.",
    },
    {
      nom: "Interaction",
      score: echelle(parCent(removal + contres + protection), 6, 24),
      poids: 0.20,
      mesure: `${removal} removal`
        + (contres > 0 ? `, ${contres} contresort${contres > 1 ? "s" : ""}` : "")
        + (protection > 0 ? `, ${protection} de protection` : ""),
      commentaire: contres > 3
        ? "Les contresorts permettent d agir pendant le tour adverse, ce qui compte double."
        : "Interaction a la vitesse du deck : il repond apres coup plutot que pendant.",
    },
    {
      nom: "Tuteurs",
      score: echelle(parCent(tuteurs), 1, 9),
      poids: 0.14,
      mesure: `${tuteurs} carte${tuteurs > 1 ? "s" : ""}`,
      commentaire: tuteurs > 3
        ? "Un deck qui cherche ses cartes joue la meme partie a chaque fois : c est un marqueur de puissance."
        : "Peu de recherche : les parties varieront d une fois sur l autre.",
    },
    {
      nom: "Sorts gratuits",
      score: echelle(parCent(gratuits), 0, 7),
      poids: 0.10,
      mesure: `${gratuits} carte${gratuits > 1 ? "s" : ""}`,
      commentaire: gratuits > 0
        ? "Jouer sans payer libere du mana et casse les echanges a un pour un."
        : "Aucun sort gratuit ; tout se paie au prix affiche.",
    },
    {
      nom: "Densite de cartes de reference",
      score: echelle(prixMoyen, 1.2, 9),
      poids: 0.12,
      mesure: `${prixMoyen.toFixed(2)} € par carte`,
      commentaire: "Le prix moyen ne mesure pas la qualite, mais les cartes les plus jouees "
        + "sont aussi les plus recherchees : il sert d indice indirect.",
    },
  ];

  const brut = signaux.reduce((s, x) => s + x.score * x.poids, 0);
  const note = Math.round(Math.max(1, Math.min(10, 1 + brut * 9)) * 10) / 10;
  const palier = PALIERS.find((p) => note < p.max) ?? PALIERS[PALIERS.length - 1];

  return {
    note,
    palier: palier.nom,
    resume: palier.resume,
    axes: signaux
      .map((s) => ({
        nom: s.nom,
        mesure: s.mesure,
        part: Math.round(s.score * 100) / 100,
        commentaire: s.commentaire,
      }))
      .sort((a, b) => b.part - a.part),
  };
}
