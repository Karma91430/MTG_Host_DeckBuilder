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
    couleurs: { fond: "#181d26", panneau: "#222933", bordure: "#38424f",
                texte: "#e8eef5", attenue: "#9aa7b6", accent: "#e09a4f", accentTexte: "#181d26" },
  },
  {
    id: "foret", nom: "Canopee", set: "blb", ambiance: "Verts profonds, bois et mousse",
    couleurs: { fond: "#18211a", panneau: "#212d24", bordure: "#354736",
                texte: "#e9f2e7", attenue: "#9db69d", accent: "#86c95f", accentTexte: "#18211a" },
  },
  {
    id: "abysse", nom: "Abysse", set: "lci", ambiance: "Bleus marins et or immerge",
    couleurs: { fond: "#111f2d", panneau: "#1a2c3d", bordure: "#2a4459",
                texte: "#e6f0f8", attenue: "#93aec5", accent: "#e8bc63", accentTexte: "#111f2d" },
  },
  {
    id: "forge", nom: "Forge", set: "one", ambiance: "Metal chauffe et braises",
    couleurs: { fond: "#211711", panneau: "#2d2019", bordure: "#443026",
                texte: "#f5ebe2", attenue: "#bf9f8d", accent: "#e86f3a", accentTexte: "#211711" },
  },
  {
    id: "sepulcre", nom: "Sepulcre", set: "dsk", ambiance: "Violets funebres et brume",
    couleurs: { fond: "#1a1524", panneau: "#241d31", bordure: "#3a2d4e",
                texte: "#efe9f7", attenue: "#a99bc0", accent: "#b183e8", accentTexte: "#1a1524" },
  },
  {
    id: "steppe", nom: "Steppe", set: "tdm", ambiance: "Ocres, cuir et poussiere",
    couleurs: { fond: "#201a12", panneau: "#2b231a", bordure: "#413527",
                texte: "#f4ede1", attenue: "#bcaa8e", accent: "#e0ab48", accentTexte: "#201a12" },
  },
  {
    id: "orbite", nom: "Orbite", set: "eoe", ambiance: "Noir spatial et cyan froid",
    couleurs: { fond: "#0e1520", panneau: "#16202e", bordure: "#243449",
                texte: "#e7f0fa", attenue: "#8ba1bb", accent: "#57d8e0", accentTexte: "#0e1520" },
  },
  {
    id: "parchemin", nom: "Parchemin", set: "dmu", ambiance: "Clair, encre sur papier",
    couleurs: { fond: "#efe9dc", panneau: "#fbf8f2", bordure: "#d6cdb9",
                texte: "#2a251f", attenue: "#756d5e", accent: "#a0602f", accentTexte: "#ffffff" },
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
