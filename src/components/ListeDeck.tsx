"use client";

import { useMemo, useState } from "react";
import { categorieType, type EntreeResolue } from "@/lib/deck";
import { imageDe } from "@/lib/carte";
import { CATEGORIES, sousTypes } from "@/lib/categories";
import ColonnesDeck from "./ColonnesDeck";

type Affichage = "colonnes" | "grille" | "liste";
type Groupement = "type" | "categorie";

const ORDRE_TYPES = ["Oathbreaker", "Sort fetiche", "Commandant", "Creatures", "Planeswalkers",
                     "Ephemeres", "Rituels", "Artefacts", "Enchantements", "Batailles",
                     "Terrains", "Autres"];
const SANS = "Sans categorie";

/** Intitule d'une carte en zone de commandement, selon le format. */
function intituleCommandement(e: EntreeResolue, format: string): string {
  if (format !== "oathbreaker") return "Commandant";
  if (/planeswalker/i.test(e.carte.type_line || "")) return "Oathbreaker";
  if (/instant|sorcery/i.test(e.carte.type_line || "")) return "Sort fetiche";
  return "Commandant";
}


export default function ListeDeck({
  entrees, onModifier, onSurvol, onOuvrir, format = "commander",
}: {
  entrees: EntreeResolue[];
  format?: string;
  onModifier: (entryId: string, champs: Record<string, unknown>) => void;
  onSurvol: (e: EntreeResolue | null) => void;
  onOuvrir: (e: EntreeResolue) => void;
}) {
  const [affichage, setAffichage] = useState<Affichage>("grille");
  const [groupement, setGroupement] = useState<Groupement>("type");
  const [edite, setEdite] = useState<string | null>(null);
  const [filtreTexte, setFiltreTexte] = useState("");
  const [filtreSousType, setFiltreSousType] = useState("");
  const [horsIdentite, setHorsIdentite] = useState(false);

  // Identite couleur du commandant : sert au filtre des cartes non jouables.
  const identite = useMemo(() => {
    const c = entrees.filter((e) => e.zone === "command");
    if (c.length === 0) return null;
    const porteurs = format === "oathbreaker"
      ? c.filter((e) => /planeswalker/i.test(e.carte.type_line || ""))
      : c;
    return new Set((porteurs.length > 0 ? porteurs : c)
      .flatMap((e) => e.carte.color_identity ?? []));
  }, [entrees, format]);

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
      if (horsIdentite) {
        if (!identite) return false;
        if (!(e.carte.color_identity ?? []).some((s) => !identite.has(s))) return false;
      }
      return true;
    });
  }, [entrees, filtreTexte, filtreSousType, horsIdentite, identite]);

  const groupes = useMemo(() => {
    const g = new Map<string, EntreeResolue[]>();
    for (const e of filtrees) {
      const cle = e.zone === "command" ? intituleCommandement(e, format)
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
  }, [filtrees, groupement, format]);

  const total = filtrees.reduce((s, e) => s + e.quantity, 0);
  const filtreActif = Boolean(filtreTexte || filtreSousType || horsIdentite);

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
          {identite && (
            <button onClick={() => setHorsIdentite((v) => !v)}
                    className={onglet(horsIdentite)}
                    title="Cartes qui sortent de l'identite couleur du commandant">
              Hors identite
            </button>
          )}
          {filtreActif && (
            <>
              <span className="text-sm text-attenue">{total} carte{total > 1 ? "s" : ""}</span>
              <button onClick={() => { setFiltreTexte(""); setFiltreSousType(""); setHorsIdentite(false); }}
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
        <ColonnesDeck groupes={groupes} onModifier={onModifier} onSurvol={onSurvol} onOuvrir={onOuvrir} />
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
              <ul className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(var(--carte-l), 1fr))" }}>
                {liste.map((e) => (
                  <li key={e.id} className="group relative" onMouseEnter={() => onSurvol(e)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDe(e.carte, "normal") ?? ""} alt={e.carte.name} loading="lazy"
                         onClick={() => onOuvrir(e)}
                         className="w-full cursor-pointer rounded-[4.75%] border border-bordure shadow-lg
                                    transition group-hover:-translate-y-1 group-hover:border-accent" />
                    {e.quantity > 1 && (
                      <span className="absolute left-2 top-2 rounded-md bg-black/85 px-2 py-0.5 text-sm font-semibold text-white">
                        {e.quantity}
                      </span>
                    )}
                    {(e.owned ?? "none") !== "have" && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/85 px-1.5 py-0.5 text-[10px] text-white"
                            title={e.owned === "getting" ? "A acheter" : "Manquante"}>
                        {e.owned === "getting" ? "achat" : "manque"}
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
                    <span className="min-w-0 flex-1 cursor-pointer" onClick={() => onOuvrir(e)}>
                      <span className="block truncate hover:text-accent">{e.carte.name}</span>
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
