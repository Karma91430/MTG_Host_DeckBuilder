"use client";

import type { EntreeResolue } from "@/lib/deck";
import { imageDe } from "@/lib/carte";

/**
 * Vue en colonnes empilees, la disposition de reference des deckbuilders.
 *
 * Chaque categorie forme une colonne ou les cartes se chevauchent : seule la
 * bande superieure reste visible, ce qui laisse lire l'illustration et le nom
 * tout en tenant un deck entier sur un ecran. La carte survolee passe au
 * premier plan et se devoile entierement.
 */

/** Hauteur de bande visible d'une carte empilee, en pixels. */
const BANDE = 42;

export default function ColonnesDeck({
  groupes, onModifier, onSurvol,
}: {
  groupes: [string, EntreeResolue[]][];
  onModifier: (entryId: string, champs: Record<string, unknown>) => void;
  onSurvol: (e: EntreeResolue | null) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groupes.map(([cle, liste]) => {
        // Les exemplaires multiples occupent une seule place dans la pile :
        // la quantite est affichee en pastille plutot que repetee.
        const hauteur = (liste.length - 1) * BANDE + 240;
        return (
          <section key={cle} className="w-[172px] shrink-0">
            <h3 className="mb-2 flex items-baseline justify-between gap-2 border-b border-bordure pb-1">
              <span className="truncate text-sm font-medium">{cle}</span>
              <span className="text-xs text-attenue">
                {liste.reduce((s, e) => s + e.quantity, 0)}
              </span>
            </h3>

            <ul className="relative" style={{ height: hauteur }}>
              {liste.map((e, i) => (
                <li
                  key={e.id}
                  className="group absolute left-0 w-full transition-transform duration-150 hover:z-30 hover:-translate-y-1"
                  style={{ top: i * BANDE, zIndex: i }}
                  onMouseEnter={() => onSurvol(e)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDe(e.carte, "normal") ?? ""}
                    alt={e.carte.name}
                    loading="lazy"
                    className="w-full rounded-[4.75%] border border-bordure shadow-xl
                               group-hover:border-accent"
                  />
                  {e.quantity > 1 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/85 px-1.5 text-xs font-semibold text-white">
                      {e.quantity}×
                    </span>
                  )}
                  <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                    <button
                      onClick={() => onModifier(e.id, { quantity: e.quantity - 1 })}
                      className="rounded bg-black/85 px-1.5 text-sm leading-5 text-white hover:text-red-400"
                      title="Retirer un exemplaire"
                    >
                      −
                    </button>
                    <button
                      onClick={() => onModifier(e.id, { quantity: e.quantity + 1 })}
                      className="rounded bg-black/85 px-1.5 text-sm leading-5 text-white"
                      title="Ajouter un exemplaire"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
