"use client";

import { useCallback, useEffect, useState } from "react";
import { imageDe, type Carte } from "@/lib/carte";
import { SEUILS_DEFAUT, type Seuils, type GroupeSuggestions } from "@/lib/suggestions";

/**
 * Panneau de suggestions.
 *
 * Les propositions sont groupees par manque plutot qu'en liste plate : une
 * carte ne vaut que par la raison qui la fait apparaitre. Chaque groupe porte
 * donc son intitule et sa justification chiffree.
 *
 * Les seuils de lecture sont exposes : ce sont des choix editoriaux -- a
 * partir de combien de cartes un sous-type devient-il un theme -- et ils
 * doivent pouvoir etre discutes deck par deck.
 */

const CLE_SEUILS = "mtg-seuils-suggestions";
const cleEcartees = (deckId: string) => `mtg-suggestions-ecartees-${deckId}`;

const LIBELLES: Record<keyof Seuils, string> = {
  theme: "Cartes pour parler d'un theme",
  mecanique: "Cartes pour parler d'une mecanique",
  rampe: "Rampe attendue (deck complet)",
  pioche: "Pioche attendue (deck complet)",
  removal: "Removal attendu (deck complet)",
};

function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* mode prive */ }
}

export default function Suggestions({
  deckId, onAjouter,
}: {
  deckId: string;
  onAjouter: (carte: Carte, zone: string) => void;
}) {
  const [groupes, setGroupes] = useState<GroupeSuggestions[] | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [seuils, setSeuils] = useState<Seuils>(SEUILS_DEFAUT);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [ecartees, setEcartees] = useState<string[]>([]);

  useEffect(() => {
    setSeuils(lire(CLE_SEUILS, SEUILS_DEFAUT));
    setEcartees(lire(cleEcartees(deckId), [] as string[]));
  }, [deckId]);

  const charger = useCallback(async (s: Seuils) => {
    setChargement(true);
    setErreur("");
    try {
      const q = new URLSearchParams(
        Object.entries(s).map(([k, v]) => [k, String(v)]),
      );
      const r = await fetch(`/api/decks/${deckId}/suggestions?${q}`);
      const data = (await r.json()) as { groupes?: GroupeSuggestions[]; vide?: string };
      setGroupes(data.groupes ?? []);
      if (data.vide) setErreur(data.vide);
    } catch {
      setErreur("Scryfall n'a pas repondu. Reessaie dans un instant.");
      setGroupes([]);
    }
    setChargement(false);
  }, [deckId]);

  function ecarter(id: string) {
    const suivant = [...ecartees, id];
    setEcartees(suivant);
    ecrire(cleEcartees(deckId), suivant);
  }

  function majSeuil(cle: keyof Seuils, valeur: number) {
    const suivant = { ...seuils, [cle]: Math.max(1, valeur) };
    setSeuils(suivant);
    ecrire(CLE_SEUILS, suivant);
  }

  const visibles = (groupes ?? [])
    .map((g) => ({ ...g, cartes: g.cartes.filter((c) => !ecartees.includes(c.carte.id)) }))
    .filter((g) => g.cartes.length > 0);

  return (
    <section className="space-y-3 rounded-xl border border-bordure bg-panneau p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-medium">Suggestions</h2>
        <p className="text-xs text-attenue">
          Ce que le deck raconte de lui-meme : themes, mecaniques, creux de courbe et de mana.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setReglagesOuverts((v) => !v)}
                  className="rounded-md border border-bordure px-3 py-1.5 text-xs">
            Seuils
          </button>
          <button onClick={() => void charger(seuils)} disabled={chargement}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-texte
                             disabled:opacity-50">
            {chargement ? "Lecture du deck..." : groupes === null ? "Analyser le deck" : "Relancer"}
          </button>
        </div>
      </div>

      {reglagesOuverts && (
        <div className="grid gap-3 rounded-lg border border-bordure bg-fond p-3 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(SEUILS_DEFAUT) as (keyof Seuils)[]).map((cle) => (
            <label key={cle} className="space-y-1 text-xs text-attenue">
              {LIBELLES[cle]}
              <input type="number" min={1} max={40} value={seuils[cle]}
                     onChange={(e) => majSeuil(cle, Number(e.target.value))}
                     className="w-full text-sm" />
            </label>
          ))}
          <p className="text-[11px] text-attenue sm:col-span-2 xl:col-span-3">
            Les comptes attendus sont ramenes a la taille reelle du deck : une liste a
            moitie construite n&apos;est pas jugee sur les cibles d&apos;un deck complet.
          </p>
        </div>
      )}

      {erreur && <p className="text-sm text-attenue">{erreur}</p>}

      {groupes !== null && visibles.length === 0 && !erreur && !chargement && (
        <p className="py-6 text-center text-sm text-attenue">
          Rien a signaler : le deck couvre ses roles et sa courbe ne presente pas de creux.
        </p>
      )}

      {visibles.map((g) => (
        <div key={g.manque.cle} className="space-y-2 rounded-lg border-l-4 border-l-accent bg-fond p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-medium">{g.manque.titre}</h3>
            <p className="text-xs text-attenue">{g.manque.raison}</p>
          </div>
          <ul className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(var(--carte-l), 1fr))" }}>
            {g.cartes.map(({ carte, rang }) => (
              <li key={carte.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDe(carte, "normal") ?? ""} alt={carte.name} loading="lazy"
                     className="w-full rounded-[4.75%] border border-bordure" />
                {rang !== null && (
                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/75
                                   px-1.5 py-0.5 text-[10px] text-white"
                        title="Rang de popularite en Commander, d'apres Scryfall">
                    #{rang}
                  </span>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                                rounded-[4.75%] bg-black/75 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => onAjouter(carte, "main")}
                          className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-texte">
                    Ajouter
                  </button>
                  <button onClick={() => onAjouter(carte, "maybe")}
                          className="rounded border border-white/40 px-2 py-0.5 text-[11px] text-white">
                    A voir
                  </button>
                  <button onClick={() => ecarter(carte.id)}
                          className="text-[11px] text-white/70 hover:text-white">
                    ne plus proposer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {ecartees.length > 0 && (
        <button onClick={() => { setEcartees([]); ecrire(cleEcartees(deckId), []); }}
                className="text-xs text-attenue hover:text-accent">
          Reproposer les {ecartees.length} carte{ecartees.length > 1 ? "s" : ""} ecartee{ecartees.length > 1 ? "s" : ""}
        </button>
      )}
    </section>
  );
}
