"use client";

import { useMemo } from "react";
import { analyserMana, symboleMana } from "@/lib/mana";
import { profilMain, repartitionTerrains } from "@/lib/probabilites";
import { categorieType, type EntreeResolue, type Stats, type Probleme } from "@/lib/deck";

/** Fourchette de terrains consideree comme gardable en main de depart. */
const GARDABLE = [2, 3, 4, 5];

/**
 * Tableau de bord d'un deck.
 *
 * Chaque bloc repond a une question precise : combien coute le deck, quelles
 * couleurs reclame-t-il, de quoi est-il fait, et a quoi ressemble une
 * ouverture. Les grandeurs sont toujours donnees en clair a cote de la barre :
 * une barre seule se compare mal, et la couleur ne doit jamais porter seule
 * l'information.
 */
export default function PanneauAnalyse({
  entrees, stats, problemes,
}: { entrees: EntreeResolue[]; stats: Stats; problemes: Probleme[] }) {
  const mana = useMemo(() => analyserMana(entrees), [entrees]);

  const { taille, profil, terrainsRep, gardable } = useMemo(() => {
    const biblio = entrees.filter((e) => e.zone === "main");
    const taille = biblio.reduce((s, e) => s + e.quantity, 0);
    const compte = new Map<string, number>();
    for (const e of biblio) {
      const t = categorieType(e.carte);
      compte.set(t, (compte.get(t) ?? 0) + e.quantity);
      if (e.category && e.category !== t) {
        compte.set(e.category, (compte.get(e.category) ?? 0) + e.quantity);
      }
    }
    const rep = repartitionTerrains(taille, compte.get("Terrains") ?? 0);
    return {
      taille,
      profil: profilMain(taille, [...compte.entries()].map(([nom, presentes]) => ({ nom, presentes }))).slice(0, 6),
      terrainsRep: rep,
      gardable: GARDABLE.reduce((s, k) => s + (rep[k]?.chance ?? 0), 0),
    };
  }, [entrees]);

  const erreurs = problemes.filter((p) => p.gravite === "erreur");
  const aAcheter = entrees
    .filter((e) => (e.zone === "main" || e.zone === "command") && (e.owned ?? "none") !== "have");
  const prixManquant = aAcheter.reduce((s, e) => {
    const p = Number(e.carte.prices?.eur ?? e.carte.prices?.usd ?? 0);
    return s + (Number.isFinite(p) ? p * e.quantity : 0);
  }, 0);

  if (stats.total === 0) return null;

  const maxCourbe = Math.max(1, ...stats.courbe.map((c) => c.n));
  const maxType = Math.max(1, ...stats.parType.map((t) => t.n));
  const maxMana = Math.max(1, ...mana.lignes.flatMap((l) => [l.pips, l.sources]));
  const maxRep = Math.max(0.01, ...terrainsRep.map((t) => t.chance));

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tuile valeur={String(stats.total)} libelle="cartes"
               detail={`${mana.terrains} terrains · ${mana.rampeNonTerrain} sources hors terrain`} />
        <Tuile valeur={stats.moyenneCmc.toFixed(2)} libelle="cout converti moyen"
               detail="terrains exclus du calcul" />
        <Tuile valeur={stats.prix > 0 ? `${stats.prix} €` : "—"} libelle="valeur du deck"
               detail={aAcheter.length > 0
                 ? `${Math.round(prixManquant * 100) / 100} € restent a acheter`
                 : "toutes les cartes sont possedees"} />
        <Tuile valeur={erreurs.length === 0 ? "Conforme" : String(erreurs.length)}
               libelle={erreurs.length === 0 ? "aucun probleme" : "problemes de legalite"}
               alerte={erreurs.length > 0}
               detail={problemes[0]?.texte ?? "taille, exemplaires et identite couleur verifies"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Bloc titre="Courbe de mana"
              aide="Repartition des couts, terrains exclus — ils ecraseraient la colonne zero.">
          <div className="flex items-end gap-2" style={{ height: 150 }}>
            {stats.courbe.map((c) => (
              <div key={c.cout} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums"
                      style={{ opacity: c.n > 0 ? 1 : 0.3 }}>{c.n}</span>
                <div className="w-full rounded-t"
                     style={{ height: `${(c.n / maxCourbe) * 108}px`,
                              minHeight: c.n > 0 ? 4 : 1,
                              background: c.n > 0 ? "var(--accent)" : "var(--bordure)" }}
                     title={`${c.n} carte(s) a ${c.cout === 7 ? "7 ou plus" : c.cout}`} />
                <span className="text-xs text-attenue">{c.cout === 7 ? "7+" : c.cout}</span>
              </div>
            ))}
          </div>
        </Bloc>

        <Bloc titre="Mana demande et disponible"
              aide="Symboles reclames par les couts, face aux cartes capables de les produire."
              legende={[
                { libelle: "demande", plein: true },
                { libelle: "sources", plein: false },
              ]}>
          {mana.lignes.length === 0 ? (
            <p className="text-sm text-attenue">Aucun cout colore dans ce deck.</p>
          ) : (
            <ul className="space-y-2.5">
              {mana.lignes.map((l) => (
                <li key={l.code} className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={symboleMana(l.code)} alt={l.nom} title={l.nom}
                       width={20} height={20} className="shrink-0" />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block h-2.5 rounded" title={`${l.pips} symboles demandes`}
                          style={{ width: `${(l.pips / maxMana) * 100}%`,
                                   minWidth: l.pips > 0 ? 4 : 0,
                                   background: "var(--accent)" }} />
                    <span className="block h-2.5 rounded border" title={`${l.sources} sources`}
                          style={{ width: `${(l.sources / maxMana) * 100}%`,
                                   minWidth: l.sources > 0 ? 4 : 0,
                                   borderColor: "var(--accent)" }} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums">
                    <strong>{l.pips}</strong>
                    <span className="text-attenue"> / {l.sources}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloc>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <Bloc titre="Composition" aide="Nombre de cartes par grande famille.">
          <ul className="space-y-2">
            {stats.parType.map((t) => (
              <li key={t.nom} className="flex items-center gap-2.5">
                <span className="w-28 shrink-0 truncate text-sm text-attenue">{t.nom}</span>
                <span className="h-2.5 flex-1 rounded bg-fond">
                  <span className="block h-full rounded" title={`${t.n} cartes`}
                        style={{ width: `${(t.n / maxType) * 100}%`, background: "var(--accent)" }} />
                </span>
                <span className="w-8 shrink-0 text-right text-sm tabular-nums">{t.n}</span>
              </li>
            ))}
          </ul>
        </Bloc>

        <Bloc titre="Main de depart"
              aide={`Sur les ${taille} cartes de la bibliotheque, ouverture a sept cartes.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ul className="space-y-2">
              {profil.map((l) => (
                <li key={l.nom} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 truncate text-attenue">{l.nom}</span>
                  <span className="w-9 shrink-0 text-right font-medium tabular-nums">
                    {l.moyenne.toFixed(1)}
                  </span>
                  <span className="h-2 flex-1 rounded bg-fond">
                    <span className="block h-full rounded"
                          title={`${Math.round(l.auMoins1 * 100)} % d'en avoir au moins une`}
                          style={{ width: `${l.auMoins1 * 100}%`, background: "var(--accent)" }} />
                  </span>
                </li>
              ))}
              <li className="pt-1 text-[11px] text-attenue">
                Nombre moyen en main, puis chances d&apos;en tenir au moins une.
              </li>
            </ul>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs text-attenue">Terrains en main</span>
                <span className="text-sm font-medium tabular-nums"
                      style={{ color: gardable > 0.7 ? "var(--accent)" : "#e0704f" }}>
                  {Math.round(gardable * 100)} % jouable
                </span>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: 92 }}>
                {terrainsRep.map((t) => (
                  <div key={t.k} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t"
                         title={`${t.k} terrain(s) : ${Math.round(t.chance * 100)} %`}
                         style={{ height: `${(t.chance / maxRep) * 62}px`,
                                  minHeight: t.chance > 0.005 ? 3 : 1,
                                  background: GARDABLE.includes(t.k) ? "var(--accent)" : "var(--bordure)" }} />
                    <span className="text-[10px] text-attenue">{t.k}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-attenue">
                Une main de {GARDABLE[0]} a {GARDABLE[GARDABLE.length - 1]} terrains se garde.
              </p>
            </div>
          </div>
        </Bloc>
      </div>

      {problemes.length > 0 && (
        <Bloc titre="Points a corriger" aide="Taille, exemplaires, cartes interdites, identite couleur.">
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {problemes.map((p, i) => (
              <li key={i} className={p.gravite === "erreur" ? "text-red-400" : "text-attenue"}>
                {p.texte}
              </li>
            ))}
          </ul>
        </Bloc>
      )}
    </section>
  );
}

function Tuile({
  valeur, libelle, detail, alerte = false,
}: { valeur: string; libelle: string; detail: string; alerte?: boolean }) {
  return (
    <div className="rounded-lg border border-bordure bg-panneau p-4">
      <p className="text-3xl font-semibold tabular-nums"
         style={alerte ? { color: "#e0704f" } : undefined}>{valeur}</p>
      <p className="text-sm">{libelle}</p>
      <p className="mt-1 text-xs text-attenue">{detail}</p>
    </div>
  );
}

function Bloc({
  titre, aide, legende, children,
}: {
  titre: string; aide: string;
  legende?: { libelle: string; plein: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-bordure bg-panneau p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium">{titre}</h3>
        {legende && (
          <span className="flex items-center gap-3">
            {legende.map((l) => (
              <span key={l.libelle} className="flex items-center gap-1.5 text-xs text-attenue">
                <span className="h-2.5 w-4 rounded"
                      style={l.plein
                        ? { background: "var(--accent)" }
                        : { border: "1px solid var(--accent)" }} />
                {l.libelle}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto text-xs text-attenue">{aide}</span>
      </div>
      {children}
    </div>
  );
}
