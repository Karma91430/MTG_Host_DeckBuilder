"use client";

import { useMemo, useState } from "react";
import { surLesTours } from "@/lib/probabilites";
import { categorieType, type EntreeResolue } from "@/lib/deck";

/**
 * Chances de tenir une carte donnee selon le tour.
 *
 * Le calcul porte sur la bibliotheque, donc hors commandant : celui-ci est
 * disponible d'entree et fausserait les chiffres.
 */
export default function Probabilites({ entrees }: { entrees: EntreeResolue[] }) {
  const [cible, setCible] = useState("Terrains");

  const { taille, cibles, groupes } = useMemo(() => {
    const bibliotheque = entrees.filter((e) => e.zone === "main");
    const taille = bibliotheque.reduce((s, e) => s + e.quantity, 0);

    const g = new Map<string, number>();
    for (const e of bibliotheque) {
      g.set(categorieType(e.carte), (g.get(categorieType(e.carte)) ?? 0) + e.quantity);
      if (e.category) g.set(e.category, (g.get(e.category) ?? 0) + e.quantity);
    }
    return { taille, cibles: [...g.keys()].sort(), groupes: g };
  }, [entrees]);

  const favorables = groupes.get(cible) ?? 0;
  const lignes = taille > 0 ? surLesTours(taille, favorables) : [];

  if (taille === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-bordure bg-panneau p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Probabilites</p>
        <select value={cible} onChange={(e) => setCible(e.target.value)}
                className="ml-auto max-w-36 text-xs">
          {cibles.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-xs text-attenue">
        {favorables} carte{favorables > 1 ? "s" : ""} sur {taille} · chances d&apos;en avoir
        au moins une
      </p>
      <ul className="space-y-1">
        {lignes.map((l) => (
          <li key={l.tour} className="flex items-center gap-2 text-xs">
            <span className="w-12 shrink-0 text-attenue">T{l.tour}</span>
            <span className="h-2 flex-1 overflow-hidden rounded bg-fond">
              <span className="block h-full bg-accent" style={{ width: `${l.chance * 100}%` }} />
            </span>
            <span className="w-10 shrink-0 text-right">{Math.round(l.chance * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
