import Link from "next/link";
import { db } from "@/lib/db";
import { theme, symboleExtension } from "@/lib/themes";
import NouveauDeck from "@/components/NouveauDeck";

export const dynamic = "force-dynamic";

type Ligne = {
  id: string; name: string; format: string; theme: string;
  updated_at: string; cartes: number;
};

export default function Accueil() {
  const decks = db().prepare(`
    SELECT d.id, d.name, d.format, d.theme, d.updated_at,
           (SELECT COALESCE(SUM(quantity),0) FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone IN ('main','command')) AS cartes
    FROM decks d ORDER BY d.updated_at DESC
  `).all() as Ligne[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mes decks</h1>
          <p className="text-sm text-attenue">
            {decks.length} deck{decks.length > 1 ? "s" : ""}
          </p>
        </div>
        <NouveauDeck />
      </div>

      {decks.length === 0 ? (
        <div className="rounded-lg border border-bordure bg-panneau p-10 text-center">
          <p className="text-attenue">Aucun deck pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-attenue">
            Cree ton premier deck et choisis son identite visuelle.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => {
            const t = theme(d.theme);
            return (
              <li key={d.id}>
                <Link
                  href={`/decks/${d.id}`}
                  className="block overflow-hidden rounded-lg border transition hover:brightness-110"
                  style={{ borderColor: t.couleurs.bordure, background: t.couleurs.panneau }}
                >
                  <div className="flex items-center gap-3 px-4 py-3"
                       style={{ background: t.couleurs.fond }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={symboleExtension(t.set)} alt="" width={22} height={22}
                         className="symbole-extension shrink-0" />
                    <span className="text-xs uppercase tracking-wide"
                          style={{ color: t.couleurs.accent }}>{t.nom}</span>
                  </div>
                  <div className="p-4">
                    <p className="truncate font-medium" style={{ color: t.couleurs.texte }}>
                      {d.name}
                    </p>
                    <p className="mt-1 text-sm capitalize" style={{ color: t.couleurs.attenue }}>
                      {d.format} · {d.cartes} cartes
                    </p>
                    <p className="text-xs" style={{ color: t.couleurs.attenue }}>
                      modifie le {d.updated_at.slice(0, 10)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
