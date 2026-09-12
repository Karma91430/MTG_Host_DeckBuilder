"use client";

import { useMemo, useState } from "react";
import { categorieType, type EntreeResolue } from "@/lib/deck";
import { imageDe } from "@/lib/carte";

type Affichage = "liste" | "grille";
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
  const [affichage, setAffichage] = useState<Affichage>("liste");
  const [groupement, setGroupement] = useState<Groupement>("type");
  const [edite, setEdite] = useState<string | null>(null);

  // Les categories deja saisies alimentent l'autocompletion : on evite les
  // variantes « Rampe » / « rampe » qui creeraient deux groupes distincts.
  const categoriesConnues = useMemo(
    () => [...new Set(entrees.map((e) => e.category).filter(Boolean))].sort(),
    [entrees],
  );

  const groupes = useMemo(() => {
    const g = new Map<string, EntreeResolue[]>();
    for (const e of entrees) {
      if (e.zone === "maybe") continue;
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
      // En mode categorie, le commandant reste en tete et le fourre-tout en fin.
      if (a[0] === "Commandant") return -1;
      if (b[0] === "Commandant") return 1;
      if (a[0] === SANS) return 1;
      if (b[0] === SANS) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [entrees, groupement]);

  const bouton = (actif: boolean) =>
    `rounded-md px-3 py-1 text-xs ${actif ? "bg-accent text-accent-texte" : "border border-bordure"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-attenue">Affichage</span>
        <button className={bouton(affichage === "liste")} onClick={() => setAffichage("liste")}>Liste</button>
        <button className={bouton(affichage === "grille")} onClick={() => setAffichage("grille")}>Grille</button>
        <span className="ml-3 text-xs text-attenue">Grouper par</span>
        <button className={bouton(groupement === "type")} onClick={() => setGroupement("type")}>Type</button>
        <button className={bouton(groupement === "categorie")} onClick={() => setGroupement("categorie")}>Categorie</button>
      </div>

      {groupes.length === 0 ? (
        <p className="rounded-lg border border-bordure bg-panneau p-8 text-center text-attenue">
          Deck vide. Cherche une carte a gauche, ou colle une liste existante.
        </p>
      ) : (
        groupes.map(([cle, liste]) => (
          <div key={cle}>
            <h3 className="mb-1 text-sm font-medium">
              {cle}
              <span className="ml-2 text-attenue">
                {liste.reduce((s, e) => s + e.quantity, 0)}
              </span>
            </h3>

            {affichage === "grille" ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {liste.map((e) => (
                  <li key={e.id} className="group relative" onMouseEnter={() => onSurvol(e)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDe(e.carte, "small") ?? ""} alt={e.carte.name} loading="lazy"
                         className="w-full rounded-[4.75%] border border-bordure" />
                    {e.quantity > 1 && (
                      <span className="absolute left-1 top-1 rounded bg-black/80 px-1.5 text-xs text-white">
                        {e.quantity}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 rounded-b-[4.75%]
                                    bg-black/75 py-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity + 1 })}
                              className="px-2 text-sm text-white">+</button>
                      <button onClick={() => onModifier(e.id, { quantity: e.quantity - 1 })}
                              className="px-2 text-sm text-white">−</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-panneau">
                {liste.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm"
                      onMouseEnter={() => onSurvol(e)}>
                    <span className="w-6 shrink-0 text-right text-attenue">{e.quantity}</span>
                    <span className="min-w-0 flex-1 truncate">{e.carte.name}</span>

                    {edite === e.id ? (
                      <input
                        autoFocus
                        list="categories-connues"
                        defaultValue={e.category}
                        onBlur={(ev) => { onModifier(e.id, { category: ev.target.value.trim() }); setEdite(null); }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                          if (ev.key === "Escape") setEdite(null);
                        }}
                        placeholder="categorie"
                        className="w-32 shrink-0 py-0 text-xs"
                      />
                    ) : (
                      <button onClick={() => setEdite(e.id)}
                              className={`shrink-0 text-xs ${e.category ? "text-accent" : "text-attenue hover:text-texte"}`}
                              title="Categorie personnalisee">
                        {e.category || "+ categorie"}
                      </button>
                    )}

                    <span className="hidden shrink-0 text-xs text-attenue sm:inline">
                      {e.carte.mana_cost}
                    </span>
                    <button onClick={() => onModifier(e.id, { quantity: e.quantity + 1 })}
                            className="px-1 text-attenue hover:text-texte">+</button>
                    <button onClick={() => onModifier(e.id, { quantity: e.quantity - 1 })}
                            className="px-1 text-attenue hover:text-red-400">−</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      <datalist id="categories-connues">
        {categoriesConnues.map((c) => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}
