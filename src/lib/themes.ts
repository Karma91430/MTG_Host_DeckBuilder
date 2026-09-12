/**
 * Identites visuelles, une par univers de jeu.
 *
 * Les palettes sont ecrites a la main : on evoque l'ambiance d'une extension
 * par ses couleurs, sans reprendre le moindre visuel. Le code d'extension ne
 * sert qu'a afficher le symbole officiel, servi par Scryfall.
 *
 * Ce module ne doit rien importer : il est charge cote navigateur comme cote
 * serveur.
 */

export type Theme = {
  id: string;
  nom: string;
  /** Code d'extension, pour le symbole affiche en en-tete. */
  set: string;
  ambiance: string;
  couleurs: {
    fond: string; panneau: string; bordure: string;
    texte: string; attenue: string; accent: string; accentTexte: string;
  };
};

export const THEMES: Theme[] = [
  {
    id: "obsidian", nom: "Obsidienne", set: "mh3", ambiance: "Neutre et sombre, par defaut",
    couleurs: { fond: "#0d1117", panneau: "#161b22", bordure: "#262d36",
                texte: "#e6edf3", attenue: "#8b949e", accent: "#d98c3f", accentTexte: "#0d1117" },
  },
  {
    id: "foret", nom: "Canopee", set: "blb", ambiance: "Verts profonds, bois et mousse",
    couleurs: { fond: "#0f1710", panneau: "#17211a", bordure: "#26362a",
                texte: "#e8f0e6", attenue: "#8fa78f", accent: "#7bbf5a", accentTexte: "#0f1710" },
  },
  {
    id: "abysse", nom: "Abysse", set: "lci", ambiance: "Bleus marins et or immerge",
    couleurs: { fond: "#081420", panneau: "#0f1e2d", bordure: "#1c3145",
                texte: "#e3eef7", attenue: "#85a2ba", accent: "#e0b155", accentTexte: "#081420" },
  },
  {
    id: "forge", nom: "Forge", set: "one", ambiance: "Metal chauffe et braises",
    couleurs: { fond: "#17100c", panneau: "#221812", bordure: "#3a271c",
                texte: "#f3e7dd", attenue: "#b09383", accent: "#e2612e", accentTexte: "#17100c" },
  },
  {
    id: "sepulcre", nom: "Sepulcre", set: "dsk", ambiance: "Violets funebres et brume",
    couleurs: { fond: "#120e18", panneau: "#1b1524", bordure: "#2e2340",
                texte: "#ece6f5", attenue: "#9d8fb4", accent: "#a674e0", accentTexte: "#120e18" },
  },
  {
    id: "steppe", nom: "Steppe", set: "tdm", ambiance: "Ocres, cuir et poussiere",
    couleurs: { fond: "#16120c", panneau: "#201a12", bordure: "#362c1f",
                texte: "#f2eade", attenue: "#b3a58a", accent: "#d9a441", accentTexte: "#16120c" },
  },
  {
    id: "orbite", nom: "Orbite", set: "eoe", ambiance: "Noir spatial et cyan froid",
    couleurs: { fond: "#070b12", panneau: "#0e141f", bordure: "#1b2637",
                texte: "#e4edf7", attenue: "#7f93ad", accent: "#4fd1d9", accentTexte: "#070b12" },
  },
  {
    id: "parchemin", nom: "Parchemin", set: "dmu", ambiance: "Clair, encre sur papier",
    couleurs: { fond: "#f5f1e8", panneau: "#ffffff", bordure: "#ddd5c4",
                texte: "#2b2620", attenue: "#7a7263", accent: "#9a5b2c", accentTexte: "#ffffff" },
  },
];

export const THEME_DEFAUT = THEMES[0];

export function theme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEME_DEFAUT;
}

/** Variables CSS injectees a la racine du document pour un theme donne. */
export function variablesCss(t: Theme): string {
  const c = t.couleurs;
  return [
    `--fond:${c.fond}`, `--panneau:${c.panneau}`, `--bordure:${c.bordure}`,
    `--texte:${c.texte}`, `--attenue:${c.attenue}`,
    `--accent:${c.accent}`, `--accent-texte:${c.accentTexte}`,
  ].join(";");
}

export const symboleExtension = (set: string) =>
  `https://svgs.scryfall.io/sets/${set.toLowerCase()}.svg`;
