"use client";

import { useEffect, useState } from "react";
import { imageDe, type Carte } from "@/lib/carte";
import { ACQUISITION, CATEGORIES } from "@/lib/categories";
import type { EntreeResolue } from "@/lib/deck";
import ChoixEdition from "./ChoixEdition";

const FORMATS_AFFICHES = ["commander", "standard", "modern", "pioneer", "legacy", "pauper"];
const ACQUIS_LIBELLES: Record<string, string> = {
  have: "Possedee", getting: "A acheter", none: "Manquante",
};

/**
 * Fiche detaillee d'une carte, ouverte au clic.
 *
 * Rassemble ce qu'on veut savoir avant de trancher : texte complet, legalites,
 * prix, et les reglages propres au deck -- quantite, zone, categorie, statut
 * d'acquisition.
 */
export default function FicheCarte({
  entree, onModifier, onFermer,
}: {
  entree: EntreeResolue;
  onModifier: (entryId: string, champs: Record<string, unknown>) => void;
  onFermer: () => void;
}) {
  const c: Carte = entree.carte;
  const [face, setFace] = useState(0);
  const faces = c.card_faces ?? [];
  const recto = faces.length > 1 ? faces[face] : null;

  // La touche d'echappement ferme, comme dans toute boite de dialogue.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onFermer]);

  const image = recto?.image_uris?.normal ?? imageDe(c, "normal");
  const prixEur = c.prices?.eur ?? null;
  const prixUsd = c.prices?.usd ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6"
         onClick={onFermer}>
      <div className="w-full max-w-5xl rounded-xl border border-bordure bg-panneau shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-6 p-6">
          <div className="w-80 shrink-0 space-y-2">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={c.name} className="w-full rounded-[4.75%] border border-bordure" />
            )}
            {faces.length > 1 && (
              <button onClick={() => setFace((f) => (f + 1) % faces.length)}
                      className="w-full rounded-md border border-bordure py-1 text-xs">
                Retourner la carte
              </button>
            )}
            <ChoixEdition cardId={c.id} actuel={c.id}
                          onChoisir={(idTirage) => onModifier(entree.id, { cardId: idTirage })} />
            <a href={c.scryfall_uri} target="_blank" rel="noreferrer"
               className="block text-center text-xs text-attenue hover:text-accent">
              Voir sur Scryfall
            </a>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="flex items-start gap-3">
                <h2 className="text-2xl font-semibold">{recto?.name ?? c.name}</h2>
                <span className="ml-auto shrink-0 text-sm text-attenue">
                  {recto?.mana_cost ?? c.mana_cost}
                </span>
              </div>
              <p className="text-sm text-attenue">{recto?.type_line ?? c.type_line}</p>
              <p className="text-xs text-attenue">
                {c.set_name} · {c.rarity}
                {prixEur && ` · ${prixEur} €`}
                {!prixEur && prixUsd && ` · $${prixUsd}`}
              </p>
            </div>

            {(recto?.oracle_text ?? c.oracle_text) && (
              <p className="whitespace-pre-line rounded-md border border-bordure bg-fond p-4 text-[15px] leading-relaxed">
                {recto?.oracle_text ?? c.oracle_text}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-attenue">
                Quantite
                <input type="number" min={0} defaultValue={entree.quantity}
                       onBlur={(e) => onModifier(entree.id, { quantity: Number(e.target.value) })}
                       className="w-full text-sm" />
              </label>
              <label className="space-y-1 text-xs text-attenue">
                Zone
                <select defaultValue={entree.zone}
                        onChange={(e) => onModifier(entree.id, { zone: e.target.value })}
                        className="w-full text-sm">
                  <option value="main">Deck</option>
                  <option value="command">Commandement</option>
                  <option value="side">Reserve</option>
                  <option value="maybe">A voir</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-attenue">
                Categorie
                <select defaultValue={entree.category}
                        onChange={(e) => onModifier(entree.id, { category: e.target.value })}
                        className="w-full text-sm">
                  <option value="">— aucune —</option>
                  {CATEGORIES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
            </div>

            <div>
              <p className="mb-1 text-xs text-attenue">Acquisition</p>
              <div className="flex gap-2">
                {ACQUISITION.map((a) => (
                  <button key={a} onClick={() => onModifier(entree.id, { owned: a })}
                          className={`rounded-md px-3 py-1 text-xs ${
                            entree.owned === a ? "bg-accent font-medium text-accent-texte"
                                               : "border border-bordure"
                          }`}>
                    {ACQUIS_LIBELLES[a]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-attenue">Legalites</p>
              <ul className="flex flex-wrap gap-1.5">
                {FORMATS_AFFICHES.map((f) => {
                  const l = c.legalities?.[f];
                  const ok = l === "legal" || l === "restricted";
                  return (
                    <li key={f}
                        className={`rounded px-2 py-0.5 text-[11px] capitalize ${
                          ok ? "bg-accent/20 text-accent" : "border border-bordure text-attenue"
                        }`}>
                      {f}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between border-t border-bordure px-5 py-3">
          <button onClick={() => { onModifier(entree.id, { quantity: 0 }); onFermer(); }}
                  className="text-sm text-attenue hover:text-red-400">
            Retirer du deck
          </button>
          <button onClick={onFermer} className="rounded-md border border-bordure px-4 py-1.5 text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
