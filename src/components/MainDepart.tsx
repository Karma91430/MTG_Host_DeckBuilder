"use client";

import { useMemo } from "react";
import { profilMain, repartitionTerrains, auMoins } from "@/lib/probabilites";
import { categorieType, type EntreeResolue } from "@/lib/deck";

/** Fourchette de terrains consideree comme gardable en main de depart. */
const GARDABLE = [2, 3, 4, 5];

/**
 * Portrait de la main de depart : ce a quoi ressemble statistiquement une
 * ouverture, plutot que des probabilites isolees.
 */
export default function MainDepart({ entrees }: { entrees: EntreeResolue[] }) {
  const { taille, profil, terrains, gardable } = useMemo(() => {
    const biblio = entrees.filter((e) => e.zone === "main");
    const taille = biblio.reduce((s, e) => s + e.quantity, 0);

    // On croise les grands types et les categories saisies : un deck bien
    // range affiche « Rampe » et « Pioche », un deck brut ses seuls types.
    const compte = new Map<string, number>();
    for (const e of biblio) {
      const t = categorieType(e.carte);
      compte.set(t, (compte.get(t) ?? 0) + e.quantity);
      if (e.category && e.category !== t) {
        compte.set(e.category, (compte.get(e.category) ?? 0) + e.quantity);
      }
    }

    const nbTerrains = compte.get("Terrains") ?? 0;
    const groupes = [...compte.entries()].map(([nom, presentes]) => ({ nom, presentes }));
    const rep = repartitionTerrains(taille, nbTerrains);
    const gardable = GARDABLE.reduce((s, k) => s + (rep[k]?.chance ?? 0), 0);

    return { taille, profil: profilMain(taille, groupes).slice(0, 7), terrains: rep, gardable };
  }, [entrees]);

  if (taille === 0) return null;
  const maxRep = Math.max(...terrains.map((t) => t.chance), 0.01);

  return (
    <div className="space-y-3 rounded-lg border border-bordure bg-panneau p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Main de depart</p>
        <span className="text-xs text-attenue">7 cartes sur {taille}</span>
      </div>

      <ul className="space-y-1">
        {profil.map((l) => (
          <li key={l.nom} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-attenue">{l.nom}</span>
            <span className="w-10 shrink-0 text-right font-medium">
              {l.moyenne.toFixed(1)}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded bg-fond">
              <span className="block h-full bg-accent"
                    style={{ width: `${Math.min(100, l.auMoins1 * 100)}%` }} />
            </span>
            <span className="w-10 shrink-0 text-right text-attenue">
              {Math.round(l.auMoins1 * 100)} %
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-attenue">
        Nombre moyen en main, et chances d&apos;en avoir au moins un.
      </p>

      <div className="border-t border-bordure pt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium">Terrains en main</p>
          <span className="text-xs" style={{ color: gardable > 0.7 ? undefined : "#e0704f" }}>
            {Math.round(gardable * 100)} % gardable
          </span>
        </div>
        <div className="flex items-end gap-1" style={{ height: 44 }}>
          {terrains.map((t) => (
            <div key={t.k} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="w-full rounded-t transition-all"
                   style={{ height: `${(t.chance / maxRep) * 32}px`,
                            minHeight: t.chance > 0.005 ? 2 : 0,
                            background: GARDABLE.includes(t.k) ? "var(--accent)" : "var(--bordure)" }}
                   title={`${t.k} terrain(s) : ${Math.round(t.chance * 100)} %`} />
              <span className="text-[9px] text-attenue">{t.k}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-attenue">
          Une main de {GARDABLE[0]} a {GARDABLE[GARDABLE.length - 1]} terrains est jouable.
        </p>
      </div>
    </div>
  );
}
