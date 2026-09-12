import type { Carte } from "./carte";

export type Entree = { id: string; card_id: string; quantity: number; zone: string;
                       category: string; owned: string };
export type EntreeResolue = Entree & { carte: Carte };

/** Tailles attendues par format, pour signaler un deck incomplet. */
export const TAILLES: Record<string, { principal: number; commandant: number }> = {
  commander: { principal: 99, commandant: 1 },
  standard: { principal: 60, commandant: 0 },
  modern: { principal: 60, commandant: 0 },
  pioneer: { principal: 60, commandant: 0 },
  legacy: { principal: 60, commandant: 0 },
  pauper: { principal: 60, commandant: 0 },
  brawl: { principal: 59, commandant: 1 },
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

  const singleton = format === "commander" || format === "brawl";
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

  // En Commander, chaque carte doit tenir dans l'identite du commandant.
  if (singleton && commandants.length > 0) {
    const identite = new Set(commandants.flatMap((c) => c.carte.color_identity ?? []));
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
