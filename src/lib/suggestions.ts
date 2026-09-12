/**
 * Lecture des manques d'un deck, et traduction en requetes Scryfall.
 *
 * Le principe : ne rien inventer, lire ce que le deck raconte deja de
 * lui-meme. Les sous-types qui reviennent disent son theme, les motifs de
 * texte disent sa mecanique, la courbe et l'analyse de mana disent ses creux.
 * Chaque manque porte sa raison d'etre, parce qu'une suggestion sans
 * justification ne se discute pas.
 *
 * Module sans dependance vers la base : il est lu aussi bien par le composant
 * client que par la route qui interroge Scryfall.
 */

import type { Carte } from "./carte";
import type { EntreeResolue } from "./deck";
import { categorieType } from "./deck";
import { sousTypes } from "./categories";
import { analyserMana } from "./mana";

/**
 * Seuils de lecture.
 *
 * Ce sont des choix editoriaux, pas des verites : a partir de combien de
 * cartes un sous-type devient-il un theme, combien de rampe attend-on
 * vraiment. Ils sont donc reglables depuis le panneau, et ces valeurs ne sont
 * que le point de depart.
 */
export type Seuils = {
  /** Occurrences d'un sous-type a partir desquelles on parle de theme. */
  theme: number;
  /** Occurrences d'un motif de texte a partir desquelles on parle de mecanique. */
  mecanique: number;
  /** Cartes de rampe attendues dans un deck Commander. */
  rampe: number;
  /** Cartes de pioche attendues. */
  pioche: number;
  /** Cartes de removal attendues, cible et masse confondues. */
  removal: number;
};

export const SEUILS_DEFAUT: Seuils = {
  theme: 5, mecanique: 4, rampe: 10, pioche: 8, removal: 8,
};

/**
 * Mecaniques reconnues au texte.
 *
 * Chaque motif sert deux fois : a compter ce que le deck fait deja, et a
 * formuler la requete qui trouvera des cartes du meme genre.
 */
const MECANIQUES: { nom: string; motif: RegExp; requete: string }[] = [
  { nom: "jetons", motif: /create[s]? (a|an|\w+) [^.]*token/i, requete: 'o:"create" o:"token"' },
  { nom: "sacrifice", motif: /sacrifice (a|an|another|one|\w+) /i, requete: 'o:"sacrifice a"' },
  { nom: "cimetiere", motif: /from your graveyard|in your graveyard|mill/i, requete: 'o:"from your graveyard"' },
  { nom: "+1/+1", motif: /\+1\/\+1 counter/i, requete: 'o:"+1/+1 counter"' },
  { nom: "artefacts", motif: /artifact(s)? you control|artifact enters/i, requete: 'o:"artifact you control"' },
  { nom: "blink", motif: /exile .*(then )?return .* to the battlefield/i, requete: 'o:"exile" o:"return" o:"battlefield"' },
  { nom: "vol", motif: /\bflying\b/i, requete: "o:flying" },
  { nom: "soins", motif: /you gain \d+ life|gain life/i, requete: 'o:"gain" o:"life"' },
  { nom: "degats directs", motif: /deals? \d+ damage to (any target|target player)/i, requete: 'o:"damage to any target"' },
  { nom: "defausse", motif: /discard(s)? a card|each opponent discards/i, requete: 'o:"discards a card"' },
];

/** Motifs servant a compter la rampe, la pioche et le removal deja presents. */
const ROLES: { nom: keyof Pick<Seuils, "rampe" | "pioche" | "removal">; motif: RegExp }[] = [
  { nom: "rampe", motif: /search your library for (a|up to \w+) (basic )?\w* ?land|add \{[wubrgc]\}/i },
  { nom: "pioche", motif: /draw (a card|\w+ cards)/i },
  { nom: "removal", motif: /destroy target|exile target|destroy all|exile all|counter target|target creature gets -/i },
];

const REQUETE_ROLE: Record<string, string> = {
  rampe: '(o:"search your library for a basic land" or o:"add {c}" or o:"add one mana") (t:artifact or t:creature or t:sorcery or t:enchantment)',
  pioche: 'o:"draw" o:"card" -t:land',
  removal: '(o:"destroy target" or o:"exile target" or o:"destroy all") -t:land',
};

export type Manque = {
  /** Identifiant stable, pour retenir ce que l'utilisateur a ecarte. */
  cle: string;
  titre: string;
  raison: string;
  /** Requete Scryfall, identite couleur et format exclus : ils sont ajoutes apres. */
  requete: string;
  /** Du plus criant au plus accessoire. */
  poids: number;
};

const texteDe = (c: Carte) =>
  c.oracle_text ?? (c.card_faces ?? []).map((f) => f.oracle_text ?? "").join(" ") ?? "";

/** Identite couleur du deck, prise sur le commandant s'il y en a un. */
export function identiteDuDeck(entrees: EntreeResolue[]): string[] {
  const commandants = entrees.filter((e) => e.zone === "command");
  const source = commandants.length > 0
    ? commandants
    : entrees.filter((e) => e.zone === "main");
  return [...new Set(source.flatMap((e) => e.carte.color_identity ?? []))];
}

/**
 * Ce que le deck fait deja : themes, mecaniques et roles, comptes une fois.
 *
 * Expose a part car l'estimation de puissance s'en sert aussi.
 */
export function profilDuDeck(entrees: EntreeResolue[], seuils: Seuils = SEUILS_DEFAUT) {
  const jouees = entrees.filter((e) => e.zone === "main" || e.zone === "command");

  const themes = new Map<string, number>();
  const mecaniques = new Map<string, number>();
  const roles: Record<string, number> = { rampe: 0, pioche: 0, removal: 0 };

  for (const e of jouees) {
    const carte = e.carte;
    const texte = texteDe(carte);

    if (categorieType(carte) !== "Terrains") {
      for (const st of sousTypes(carte)) themes.set(st, (themes.get(st) ?? 0) + e.quantity);
    }
    for (const m of MECANIQUES) {
      if (m.motif.test(texte)) mecaniques.set(m.nom, (mecaniques.get(m.nom) ?? 0) + e.quantity);
    }
    // Une carte ne compte que pour un role, le premier reconnu : sans cela une
    // carte qui detruit et fait piocher gonflerait deux compteurs a la fois.
    const categorie = (e.category || "").toLowerCase();
    const explicite = categorie.includes("rampe") ? "rampe"
      : categorie.includes("pioche") ? "pioche"
      : categorie.includes("removal") ? "removal" : "";
    if (explicite) {
      roles[explicite] += e.quantity;
    } else {
      for (const r of ROLES) {
        if (r.motif.test(texte)) { roles[r.nom] += e.quantity; break; }
      }
    }
  }

  return {
    themes: [...themes.entries()].filter(([, n]) => n >= seuils.theme)
      .sort((a, b) => b[1] - a[1]),
    mecaniques: [...mecaniques.entries()].filter(([, n]) => n >= seuils.mecanique)
      .sort((a, b) => b[1] - a[1]),
    roles,
  };
}

/**
 * Les manques d'un deck, du plus criant au plus accessoire.
 *
 * Un deck vide ou presque ne produit rien : suggerer quoi que ce soit a partir
 * de trois cartes reviendrait a deviner.
 */
export function manquesDuDeck(
  entrees: EntreeResolue[],
  format: string,
  seuils: Seuils = SEUILS_DEFAUT,
): Manque[] {
  const jouees = entrees.filter((e) => e.zone === "main");
  const taille = jouees.reduce((s, e) => s + e.quantity, 0);
  if (taille < 10) return [];

  const { themes, mecaniques, roles } = profilDuDeck(entrees, seuils);
  const mana = analyserMana(entrees);
  const out: Manque[] = [];

  // Proportionnel a la taille reelle : un deck a 40 cartes n'attend pas les
  // memes comptes qu'un Commander complet.
  const attendu = (cible: number) =>
    format === "commander" || format === "brawl"
      ? Math.round(cible * Math.min(1, taille / 99))
      : Math.round(cible * 0.6 * Math.min(1, taille / 60));

  for (const role of ["rampe", "pioche", "removal"] as const) {
    const cible = attendu(seuils[role]);
    const actuel = roles[role];
    if (cible > 0 && actuel < cible) {
      out.push({
        cle: `role:${role}`,
        titre: `Sous la moyenne en ${role}`,
        raison: `${actuel} carte${actuel > 1 ? "s" : ""} contre ${cible} attendue${cible > 1 ? "s" : ""} a cette taille de deck.`,
        requete: REQUETE_ROLE[role],
        poids: 100 + (cible - actuel) * 4,
      });
    }
  }

  // Une couleur dont la demande depasse nettement l'offre bloque le deck,
  // quel que soit le nombre total de terrains.
  if (mana.totalPips > 0 && mana.totalSources > 0) {
    for (const l of mana.lignes) {
      if (l.code === "C" || l.pips === 0) continue;
      const partDemande = l.pips / mana.totalPips;
      const partOffre = l.sources / mana.totalSources;
      if (partDemande - partOffre > 0.12) {
        out.push({
          cle: `mana:${l.code}`,
          titre: `${l.nom} sous-alimente`,
          raison: `${Math.round(partDemande * 100)} % des symboles reclames, `
            + `${Math.round(partOffre * 100)} % des sources seulement.`,
          requete: `(t:land or o:"add {${l.code.toLowerCase()}}") id<=${l.code}`,
          poids: 90 + Math.round((partDemande - partOffre) * 100),
        });
      }
    }
  }

  // Un creux de courbe dans les couts bas se paie des les premiers tours.
  const nonTerrains = jouees.filter((e) => categorieType(e.carte) !== "Terrains");
  const totalSorts = nonTerrains.reduce((s, e) => s + e.quantity, 0);
  if (totalSorts >= 15) {
    for (const cout of [1, 2, 3]) {
      const n = nonTerrains
        .filter((e) => Math.round(e.carte.cmc ?? 0) === cout)
        .reduce((s, e) => s + e.quantity, 0);
      const cible = Math.round(totalSorts * (cout === 1 ? 0.08 : 0.14));
      if (n < cible) {
        const theme = mecaniques[0]?.[0];
        const motif = MECANIQUES.find((m) => m.nom === theme)?.requete;
        out.push({
          cle: `courbe:${cout}`,
          titre: `Votre courbe manque de cartes a ${cout} mana`,
          raison: `${n} carte${n > 1 ? "s" : ""} a ${cout} mana pour ${totalSorts} sorts, `
            + `${cible} seraient plus confortables.`,
          requete: `cmc=${cout} -t:land${motif ? ` (${motif})` : ""}`,
          poids: 70 + (cible - n),
        });
      }
    }
  }

  // Le theme et la mecanique viennent apres les manques structurels : ils
  // enrichissent un deck qui tient deja debout.
  for (const [nom, n] of themes.slice(0, 2)) {
    out.push({
      cle: `theme:${nom}`,
      titre: `Renforcer le theme ${nom}`,
      raison: `${n} cartes du deck sont des ${nom}.`,
      requete: `t:${nom.toLowerCase()}`,
      poids: 60 + n,
    });
  }

  for (const [nom, n] of mecaniques.slice(0, 3)) {
    const m = MECANIQUES.find((x) => x.nom === nom);
    if (!m) continue;
    out.push({
      cle: `mecanique:${nom}`,
      titre: `Appuyer la mecanique « ${nom} »`,
      raison: `${n} cartes du deck tournent autour de ${nom}.`,
      requete: m.requete,
      poids: 50 + n,
    });
  }

  return out.sort((a, b) => b.poids - a.poids).slice(0, 8);
}

/**
 * Requete complete envoyee a Scryfall.
 *
 * L'identite couleur et la legalite ne sont pas negociables : une suggestion
 * qui sort de l'identite du commandant est injouable, et le rappeler dans
 * chaque motif serait redondant.
 */
export function requeteComplete(m: Manque, identite: string[], format: string): string {
  const id = identite.length > 0 ? identite.join("") : "c";
  return `${m.requete} id<=${id} legal:${format} -is:digital`;
}

export type Suggestion = { carte: Carte; rang: number | null };
export type GroupeSuggestions = { manque: Manque; cartes: Suggestion[] };
