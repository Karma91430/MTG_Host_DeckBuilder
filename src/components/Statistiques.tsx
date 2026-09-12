"use client";

import type { Stats } from "@/lib/deck";

const NOMS_COULEURS: Record<string, string> = {
  W: "Blanc", U: "Bleu", B: "Noir", R: "Rouge", G: "Vert",
};
const TEINTES: Record<string, string> = {
  W: "#e8e0c8", U: "#3b7dd8", B: "#6b5b7b", R: "#d84f3b", G: "#3f9455",
};

export default function Statistiques({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...stats.courbe.map((c) => c.n));

  return (
    <div className="space-y-5 rounded-lg border border-bordure bg-panneau p-4">
      <div>
        <p className="text-3xl font-semibold">{stats.total}</p>
        <p className="text-sm text-attenue">
          cartes · cout moyen {stats.moyenneCmc}
          {stats.prix > 0 && ` · ~${stats.prix} €`}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Courbe de mana</p>
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {stats.courbe.map((c) => (
            <div key={c.cout} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-accent transition-all"
                   style={{ height: `${(c.n / max) * 64}px`, minHeight: c.n ? 3 : 0 }}
                   title={`${c.n} carte(s) a ${c.cout}`} />
              <span className="text-[10px] text-attenue">{c.cout === 7 ? "7+" : c.cout}</span>
            </div>
          ))}
        </div>
      </div>

      {stats.couleurs.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Identite couleur</p>
          <ul className="space-y-1 text-sm">
            {stats.couleurs.map((c) => (
              <li key={c.symbole} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full"
                      style={{ background: TEINTES[c.symbole] ?? "#888" }} />
                <span className="text-attenue">{NOMS_COULEURS[c.symbole] ?? c.symbole}</span>
                <span className="ml-auto">{c.n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Repartition</p>
        <ul className="space-y-1 text-sm">
          {stats.parType.map((t) => (
            <li key={t.nom} className="flex justify-between gap-2">
              <span className="text-attenue">{t.nom}</span>
              <span>{t.n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
