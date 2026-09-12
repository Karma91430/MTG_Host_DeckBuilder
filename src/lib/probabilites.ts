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
