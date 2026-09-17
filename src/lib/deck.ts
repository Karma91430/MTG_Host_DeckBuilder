import type { Carte } from "./carte";

export type Entree = { id: string; card_id: string; quantity: number; zone: string;
                       category: string; owned: string };
export type EntreeResolue = Entree & { carte: Carte };

/** Tailles attendues par format, pour signaler un deck incomplet. */
export const TAILLES: Record<string, { principal: number; commandant: number }> = {
  commander: { principal: 99, commandant: 1 },
  // En Oathbreaker la zone de commandement porte deux cartes : le planeswalker
  // et son sort fetiche. Le deck fait soixante cartes, elles comprises.
  oathbreaker: { principal: 58, commandant: 2 },
  standard: { principal: 60, commandant: 0 },
  modern: { principal: 60, commandant: 0 },
  pioneer: { principal: 60, commandant: 0 },
  legacy: { principal: 60, commandant: 0 },
  pauper: { principal: 60, commandant: 0 },
  brawl: { principal: 59, commandant: 1 },
};

/** Formats a exemplaire unique, hors terrains de base. */
export const SINGLETON = ["commander", "brawl", "oathbreaker"];

/** Points de vie de depart, pour le playtest. */
export const VIES_DEPART: Record<string, number> = {
  commander: 40, brawl: 30, oathbreaker: 20,
};

const SANS_LIMITE = /basic land|un terrain de base/i;

/** Grande categorie de type, pour regrouper la liste et la courbe. */
export function categorieType(c: Carte): string {
  const t = (c.type_line || "").toLowerCase();
  if (t.includes("land")) return "Terrains";
  if (t.includes("creature")) return "Creatures";
  if (t.includes("planeswalker")) return "Planeswalkers";
  if (t.includes("instant")) return "Ephemeres";
  if (t.includes("sorcery")) return "Rituels";
  if (t.includes("artifact")) return "Artefacts";
  if (t.includes("enchantment")) return "Enchantements";
  if (t.includes("battle")) return "Batailles";
  return "Autres";
}

export type Stats = {
  total: number;
  parType: { nom: string; n: number }[];
  courbe: { cout: number; n: number }[];
  couleurs: { symbole: string; n: number }[];
  prix: number;
  moyenneCmc: number;
};

export function statistiques(entrees: EntreeResolue[]): Stats {
  const principales = entrees.filter((e) => e.zone === "main" || e.zone === "command");
  const total = principales.reduce((s, e) => s + e.quantity, 0);

  const parType = new Map<string, number>();
  const courbe = new Map<number, number>();
  const couleurs = new Map<string, number>();
  let prix = 0;
  let sommeCmc = 0;
  let nonTerrains = 0;

  for (const e of principales) {
    const cat = categorieType(e.carte);
    parType.set(cat, (parType.get(cat) ?? 0) + e.quantity);

    // Les terrains n'ont pas de cout de mana : les inclure ecraserait la
    // courbe sur la colonne zero.
    if (cat !== "Terrains") {
      const cout = Math.min(Math.round(e.carte.cmc ?? 0), 7);
      courbe.set(cout, (courbe.get(cout) ?? 0) + e.quantity);
      sommeCmc += (e.carte.cmc ?? 0) * e.quantity;
      nonTerrains += e.quantity;
    }
    for (const s of e.carte.color_identity ?? []) {
      couleurs.set(s, (couleurs.get(s) ?? 0) + e.quantity);
    }
    const p = Number(e.carte.prices?.eur ?? e.carte.prices?.usd ?? 0);
    if (Number.isFinite(p)) prix += p * e.quantity;
  }

  return {
    total,
    parType: [...parType.entries()].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n),
    courbe: Array.from({ length: 8 }, (_, i) => ({ cout: i, n: courbe.get(i) ?? 0 })),
    couleurs: [...couleurs.entries()].map(([symbole, n]) => ({ symbole, n }))
      .sort((a, b) => b.n - a.n),
    prix: Math.round(prix * 100) / 100,
    moyenneCmc: nonTerrains ? Math.round((sommeCmc / nonTerrains) * 100) / 100 : 0,
  };
}

export type Probleme = { gravite: "erreur" | "avis"; texte: string };

/** Controles de legalite : taille, exemplaires, identite couleur. */
export function problemes(format: string, entrees: EntreeResolue[]): Probleme[] {
  const out: Probleme[] = [];
  const attendu = TAILLES[format];
  const principales = entrees.filter((e) => e.zone === "main");
  const commandants = entrees.filter((e) => e.zone === "command");
  const total = principales.reduce((s, e) => s + e.quantity, 0);

  if (attendu) {
    if (total !== attendu.principal) {
      out.push({ gravite: total > attendu.principal ? "erreur" : "avis",
                 texte: `${total} cartes dans le deck, ${attendu.principal} attendues` });
    }
    if (attendu.commandant && commandants.length !== attendu.commandant) {
      out.push({ gravite: "erreur",
                 texte: `${commandants.length} commandant(s), ${attendu.commandant} attendu` });
    }
  }

  const singleton = SINGLETON.includes(format);
  for (const e of [...principales, ...commandants]) {
    const max = singleton ? 1 : 4;
    if (!SANS_LIMITE.test(e.carte.type_line || "") && e.quantity > max) {
      out.push({ gravite: "erreur", texte: `${e.carte.name} : ${e.quantity} exemplaires (max ${max})` });
    }
    const legal = e.carte.legalities?.[format];
    if (legal && legal !== "legal" && legal !== "restricted") {
      out.push({ gravite: "erreur", texte: `${e.carte.name} n'est pas autorisee en ${format}` });
    }
  }

  // La zone de commandement d'un Oathbreaker attend deux cartes de nature
  // precise : un planeswalker, et un ephemere ou rituel qui lui sert de sort
  // fetiche. Le reste du format decoule de ces deux cartes.
  if (format === "oathbreaker" && commandants.length > 0) {
    const estPlaneswalker = (e: EntreeResolue) =>
      /planeswalker/i.test(e.carte.type_line || "");
    const estSortFetiche = (e: EntreeResolue) =>
      /instant|sorcery/i.test(e.carte.type_line || "");

    const walkers = commandants.filter(estPlaneswalker);
    const sorts = commandants.filter(estSortFetiche);

    if (walkers.length !== 1) {
      out.push({ gravite: "erreur",
                 texte: walkers.length === 0
                   ? "Aucun oathbreaker : la zone de commandement attend un planeswalker"
                   : `${walkers.length} planeswalkers en commandement, un seul est autorise` });
    }
    if (sorts.length !== 1) {
      out.push({ gravite: "erreur",
                 texte: sorts.length === 0
                   ? "Aucun sort fetiche : il faut un ephemere ou un rituel en commandement"
                   : `${sorts.length} sorts fetiches, un seul est autorise` });
    }
    for (const e of commandants) {
      if (!estPlaneswalker(e) && !estSortFetiche(e)) {
        out.push({ gravite: "erreur",
                   texte: `${e.carte.name} ne peut etre ni oathbreaker ni sort fetiche` });
      }
    }
    // Le sort fetiche doit tenir dans l'identite du planeswalker, pas
    // l'inverse : c'est le planeswalker qui donne ses couleurs au deck.
    if (walkers.length === 1 && sorts.length === 1) {
      const identite = new Set(walkers[0].carte.color_identity ?? []);
      const hors = (sorts[0].carte.color_identity ?? []).filter((c) => !identite.has(c));
      if (hors.length) {
        out.push({ gravite: "erreur",
                   texte: `${sorts[0].carte.name} sort de l'identite de ${walkers[0].carte.name} (${hors.join("")})` });
      }
    }
  }

  // En Commander comme en Oathbreaker, chaque carte doit tenir dans l'identite
  // de la zone de commandement.
  if (singleton && commandants.length > 0) {
    const porteurs = format === "oathbreaker"
      ? commandants.filter((e) => /planeswalker/i.test(e.carte.type_line || ""))
      : commandants;
    const identite = new Set(
      (porteurs.length > 0 ? porteurs : commandants)
        .flatMap((c) => c.carte.color_identity ?? []));
    for (const e of principales) {
      const hors = (e.carte.color_identity ?? []).filter((s) => !identite.has(s));
      if (hors.length) {
        out.push({ gravite: "erreur",
                   texte: `${e.carte.name} sort de l'identite couleur (${hors.join("")})` });
      }
    }
  }
  return out;
}
