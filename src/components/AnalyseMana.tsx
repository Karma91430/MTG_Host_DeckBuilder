"use client";

import { useMemo } from "react";
import { analyserMana, symboleMana } from "@/lib/mana";
import type { EntreeResolue } from "@/lib/deck";

/**
 * Demande et offre de mana, cote a cote.
 *
 * La barre du haut represente les symboles colores reclames par les couts, celle
 * du bas les cartes capables de produire cette couleur. Un ecart marque entre
 * les deux annonce des blocages, quel que soit le nombre total de terrains.
 */
export default function AnalyseMana({ entrees }: { entrees: EntreeResolue[] }) {
  const a = useMemo(() => analyserMana(entrees), [entrees]);
  if (a.lignes.length === 0) return null;

  const maxPips = Math.max(1, ...a.lignes.map((l) => l.pips));
  const maxSources = Math.max(1, ...a.lignes.map((l) => l.sources));

  return (
    <div className="space-y-3 rounded-lg border border-bordure bg-panneau p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Mana</p>
        <span className="text-xs text-attenue">
          {a.terrains} terrains · {a.rampeNonTerrain} rampe
        </span>
      </div>

      <ul className="space-y-2">
        {a.lignes.map((l) => (
          <li key={l.code} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={symboleMana(l.code)} alt={l.nom} title={l.nom}
                 width={18} height={18} className="shrink-0" />
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="flex h-1.5 overflow-hidden rounded bg-fond">
                <span className="block h-full bg-accent"
                      style={{ width: `${(l.pips / maxPips) * 100}%` }}
                      title={`${l.pips} symboles dans les couts`} />
              </span>
              <span className="flex h-1.5 overflow-hidden rounded bg-fond">
                <span className="block h-full opacity-55"
                      style={{ width: `${(l.sources / maxSources) * 100}%`,
                               background: "var(--texte)" }}
                      title={`${l.sources} sources`} />
              </span>
            </span>
            <span className="w-16 shrink-0 text-right text-xs">
              <strong>{l.pips}</strong>
              <span className="text-attenue"> / {l.sources}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-attenue">
        Symboles reclames par les couts (barre pleine) face aux sources capables
        de les payer (barre claire).
      </p>
    </div>
  );
}
