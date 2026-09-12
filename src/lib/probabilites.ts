/**
 * Probabilites de pioche, par loi hypergeometrique.
 *
 * Piocher dans un deck se fait sans remise : c'est exactement le cadre de
 * cette loi, la ou une approximation binomiale surestimerait les chances.
 *
 * Module sans dependance, utilisable cote navigateur.
 */

/** Coefficient binomial, en logarithmes pour eviter le depassement. */
function logC(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  let r = 0;
  for (let i = 1; i <= k; i++) r += Math.log(n - k + i) - Math.log(i);
  return r;
}

/** Probabilite de tirer exactement k exemplaires. */
function exactement(taille: number, favorables: number, tirees: number, k: number): number {
  const num = logC(favorables, k) + logC(taille - favorables, tirees - k);
  const den = logC(taille, tirees);
  if (!Number.isFinite(num) || !Number.isFinite(den)) return 0;
  return Math.exp(num - den);
}

/** Probabilite d'en tirer au moins `mini`. */
export function auMoins(
  taille: number, favorables: number, tirees: number, mini = 1,
): number {
  if (taille <= 0 || favorables <= 0 || tirees <= 0) return 0;
  const t = Math.min(tirees, taille);
  let cumul = 0;
  for (let k = 0; k < mini; k++) cumul += exactement(taille, favorables, t, k);
  return Math.max(0, Math.min(1, 1 - cumul));
}

/**
 * Cartes vues au tour donne : la main de depart, puis une pioche par tour.
 * Le joueur qui commence ne pioche pas a son premier tour.
 */
export function cartesVues(tour: number, mainDepart = 7, commence = true): number {
  return mainDepart + Math.max(0, tour - (commence ? 1 : 0));
}

export type LigneProbabilite = { tour: number; vues: number; chance: number };

export function surLesTours(
  taille: number, favorables: number, tours = [1, 2, 3, 4, 5, 6, 8, 10],
  mainDepart = 7, commence = true,
): LigneProbabilite[] {
  return tours.map((tour) => {
    const vues = cartesVues(tour, mainDepart, commence);
    return { tour, vues, chance: auMoins(taille, favorables, vues, 1) };
  });
}

/** Probabilite de tirer exactement k exemplaires, exposee pour les profils. */
export function exactementK(taille: number, favorables: number, tirees: number, k: number): number {
  return exactement(taille, favorables, Math.min(tirees, taille), k);
}

export type LigneProfil = {
  nom: string; presentes: number; moyenne: number; auMoins1: number;
};

/**
 * Portrait statistique d'une main de depart.
 *
 * Plutot que des chances isolees, on decrit la main type : combien de
 * terrains, de creatures, de rampe en moyenne, et quelle probabilite d'en
 * avoir au moins un de chaque.
 */
export function profilMain(
  taille: number,
  groupes: { nom: string; presentes: number }[],
  mainDepart = 7,
): LigneProfil[] {
  if (taille <= 0) return [];
  return groupes
    .filter((g) => g.presentes > 0)
    .map((g) => ({
      nom: g.nom,
      presentes: g.presentes,
      // Esperance hypergeometrique : proportion x nombre de cartes tirees.
      moyenne: (g.presentes / taille) * mainDepart,
      auMoins1: auMoins(taille, g.presentes, mainDepart, 1),
    }))
    .sort((a, b) => b.moyenne - a.moyenne);
}

/** Repartition du nombre de terrains dans la main de depart. */
export function repartitionTerrains(
  taille: number, terrains: number, mainDepart = 7,
): { k: number; chance: number }[] {
  if (taille <= 0) return [];
  return Array.from({ length: mainDepart + 1 }, (_, k) => ({
    k, chance: exactementK(taille, terrains, mainDepart, k),
  }));
}
