"use client";

import { useMemo, useState } from "react";
import { categorieType, type EntreeResolue } from "@/lib/deck";
import { imageDe } from "@/lib/carte";
import { CATEGORIES, sousTypes } from "@/lib/categories";
import ColonnesDeck from "./ColonnesDeck";

type Affichage = "colonnes" | "grille" | "liste";
type Groupement = "type" | "categorie";

const ORDRE_TYPES = ["Commandant", "Creatures", "Planeswalkers", "Ephemeres", "Rituels",
                     "Artefacts", "Enchantements", "Batailles", "Terrains", "Autres"];
const SANS = "Sans categorie";

export default function ListeDeck({
  entrees, onModifier, onSurvol,
}: {
  entrees: EntreeResolue[];
  onModifier: (entryId: string, champs: Record<string, unknown>) => void;
  onSurvol: (e: EntreeResolue | null) => void;
}) {
  const [affichage, setAffichage] = useState<Affichage>("colonnes");
  const [groupement, setGroupement] = useState<Groupement>("type");
  const [edite, setEdite] = useState<string | null>(null);
  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreSousType, setFiltreSousType] = useState("");

  const categoriesConnues = useMemo(() => {
    const utilisees = entrees.map((e) => e.category).filter(Boolean);
    return [...new Set([...CATEGORIES, ...utilisees])].sort();
  }, [entrees]);

  /** Sous-types presents dans le deck, avec leur effectif. */
  const sousTypesDisponibles = useMemo(() => {
    const compte = new Map<string, number>();
    for (const e of entrees) {
      if (e.zone === "maybe") continue;
      for (const st of sousTypes(e.carte)) compte.set(st, (compte.get(st) ?? 0) + e.quantity);
    }
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entrees]);

  const filtrees = useMemo(() => {
    const q = filtreTexte.trim().toLowerCase();
    return entrees.filter((e) => {
      if (e.zone === "maybe") return false;
      if (q && !e.carte.name.toLowerCase().includes(q)
            && !(e.carte.type_line ?? "").toLowerCase().includes(q)) return false;
      if (filtreSousType && !sousTypes(e.carte).includes(filtreSousType)) return false;
      return true;
    });
  }, [entrees, filtreTexte, filtreSousType]);

  const groupes = useMemo(() => {
    const g = new Map<string, EntreeResolue[]>();
    for (const e of filtrees) {
      const cle = e.zone === "command" ? "Commandant"
        : groupement === "categorie" ? (e.category || SANS)
        : categorieType(e.carte);
      if (!g.has(cle)) g.set(cle, []);
      g.get(cle)!.push(e);
    }
    for (const liste of g.values()) {
      liste.sort((a, b) => a.carte.cmc - b.carte.cmc || a.carte.name.localeCompare(b.carte.name));
    }
    return [...g.entries()].sort((a, b) => {
      if (groupement === "type") return ORDRE_TYPES.indexOf(a[0]) - ORDRE_TYPES.indexOf(b[0]);
      if (a[0] === "Commandant") return -1;
      if (b[0] === "Commandant") return 1;
      if (a[0] === SANS) return 1;
      if (b[0] === SANS) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtrees, groupement]);

  const total = filtrees.reduce((s, e) => s + e.quantity, 0);
  const filtreActif = Boolean(filtreTexte || filtreSousType);

  const onglet = (actif: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition ${
      actif ? "bg-accent font-medium text-accent-texte" : "border border-bordure hover:brightness-125"
    }`;

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-bordure bg-panneau p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-attenue">Affichage</span>
          <button className={onglet(affichage === "colonnes")} onClick={() => setAffichage("colonnes")}>Colonnes</button>
          <button className={onglet(affichage === "grille")} onClick={() => setAffichage("grille")}>Grille</button>
          <button className={onglet(affichage === "liste")} onClick={() => setAffichage("liste")}>Liste</button>
          <span className="ml-4 text-xs uppercase tracking-wide text-attenue">Grouper</span>
          <button className={onglet(groupement === "type")} onClick={() => setGroupement("type")}>Type</button>
          <button className={onglet(groupement === "categorie")} onClick={() => setGroupement("categorie")}>Categorie</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={filtreTexte} onChange={(e) => setFiltreTexte(e.target.value)}
                 placeholder="Filtrer par nom ou type" className="w-56 text-sm" />
          <select value={filtreSousType} onChange={(e) => setFiltreSousType(e.target.value)}
                  className="text-sm" title="Sous-type">
            <option value="">Tous les sous-types</option>
            {sousTypesDisponibles.map(([st, n]) => (
              <option key={st} value={st}>{st} ({n})</option>
            ))}
          </select>
          {filtreActif && (
            <>
              <span className="text-sm text-attenue">{total} carte{total > 1 ? "s" : ""}</span>
              <button onClick={() => { setFiltreTexte(""); setFiltreSousType(""); }}
                      className="text-sm text-accent hover:underline">
                effacer
              </button>
            </>
          )}
        </div>

        {sousTypesDisponibles.length > 0 && !filtreSousType && (
          <div className="flex flex-wrap gap-1.5">
            {sousTypesDisponibles.slice(0, 12).map(([st, n]) => (
              <button key={st} onClick={() => setFiltreSousType(st)}
                      className="rounded-full border border-bordure px-2.5 py-0.5 text-xs text-attenue hover:border-accent hover:text-accent">
                {st} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {groupes.length > 0 && affichage === "colonnes" && (
        <ColonnesDeck groupes={groupes} onModifier={onModifier} onSurvol={onSurvol} />
      )}

      {groupes.length === 0 ? (
        <p className="rounded-xl border border-bordure bg-panneau p-12 text-center text-attenue">
          {filtreActif ? "Aucune carte ne correspond a ce filtre."
                       : "Deck vide. Cherche une carte a gauche, ou colle une liste existante."}
        </p>
      ) : affichage === "colonnes" ? null : (
        groupes.map(([cle, liste]) => (
          <section key={cle}>
            <h3 className="mb-2 flex items-baseline gap-2 text-base font-medium">
              {cle}
              <span className="text-sm text-attenue">
                {liste.reduce((s, e) => s + e.quantity, 0)}
              </span>
            </h3>

            {affichage === "grille" ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {liste.map((e) => (
                  <li key={e.id} className="group relative" onMouseEnter={() => onSurvol(e)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDe(e.carte, "normal") ?? ""} alt={e.carte.name} loading="lazy"
                         className="w-full rounded-[4.75%] border border-bordure shadow-lg transition
                                    group-hover:-translate-y-1 group-hover:border-accent" />
                    {e.quantity > 1 && (
                      <span className="absolute left-2 top-2 rounded-md bg-black/85 px-2 py-0.5 text-sm font-semibold text-white">
                        {e.quantity}
                      </span>
                    )}
                    {e.category && (
                      <span className="absolute right-2 top-2 rounded-md bg-black/85 px-2 py-0.5 text-[11px] text-white">
                        {e.category}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3
                                    rounded-b-[4.75%] bg-black/80 py-2 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity - 1 })}
                              className="px-3 text-lg leading-none text-white">−</button>
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity + 1 })}
                              className="px-3 text-lg leading-none text-white">+</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-bordure overflow-hidden rounded-xl border border-bordure bg-panneau">
                {liste.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5"
                      onMouseEnter={() => onSurvol(e)}>
                    <span className="w-7 shrink-0 text-right text-attenue">{e.quantity}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{e.carte.name}</span>
                      <span className="block truncate text-xs text-attenue">{e.carte.type_line}</span>
                    </span>

                    {edite === e.id ? (
                      <select autoFocus defaultValue={e.category}
                              onChange={(ev) => { onModifier(e.id, { category: ev.target.value }); setEdite(null); }}
                              onBlur={() => setEdite(null)}
                              className="w-40 shrink-0 text-xs">
                        <option value="">— aucune —</option>
                        {categoriesConnues.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEdite(e.id)}
                              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                                e.category ? "border-accent text-accent" : "border-bordure text-attenue hover:text-texte"
                              }`}>
                        {e.category || "+ categorie"}
                      </button>
                    )}

                    <span className="hidden w-20 shrink-0 text-right text-sm text-attenue sm:inline">
                      {e.carte.mana_cost}
                    </span>
                    <span className="flex shrink-0 items-center">
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity - 1 })}
                              className="px-2 text-attenue hover:text-red-400">−</button>
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity + 1 })}
                              className="px-2 text-attenue hover:text-texte">+</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
