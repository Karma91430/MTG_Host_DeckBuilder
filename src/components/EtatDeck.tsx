"use client";

import type { EntreeResolue, Probleme } from "@/lib/deck";

/**
 * Etat du deck : ce qu'il reste a acquerir, et ce qui le rend non conforme.
 *
 * Les deux repondent a la meme question -- puis-je jouer ce deck tel quel ? --
 * et gagnent a etre lus ensemble plutot que dans deux blocs separes.
 */
export default function EtatDeck({
  entrees, problemes,
}: { entrees: EntreeResolue[]; problemes: Probleme[] }) {
  const concernees = entrees.filter((e) => e.zone === "main" || e.zone === "command");
  const manquantes = concernees.filter((e) => (e.owned ?? "none") !== "have");
  const possedees = concernees.length - manquantes.length;

  const prix = manquantes.reduce((s, e) => {
    const p = Number(e.carte.prices?.eur ?? e.carte.prices?.usd ?? 0);
    return s + (Number.isFinite(p) ? p * e.quantity : 0);
  }, 0);

  const erreurs = problemes.filter((p) => p.gravite === "erreur");

  return (
    <div className="space-y-4 rounded-lg border border-bordure bg-panneau p-4">
      <div>
        <p className="mb-1 text-sm font-medium">Acquisition</p>
        {manquantes.length === 0 ? (
          <p className="text-sm text-attenue">
            {concernees.length > 0 ? "Toutes les cartes sont possedees." : "Deck vide."}
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold">{Math.round(prix * 100) / 100} €</p>
            <p className="text-xs text-attenue">
              {manquantes.length} a acheter · {possedees} deja possedee{possedees > 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>

      <div className="border-t border-bordure pt-3">
        <p className="mb-1 text-sm font-medium">
          Legalite{" "}
          {erreurs.length === 0
            ? <span className="text-accent">· conforme</span>
            : <span className="text-red-400">· {erreurs.length} probleme{erreurs.length > 1 ? "s" : ""}</span>}
        </p>
        {problemes.length === 0 ? (
          <p className="text-sm text-attenue">Aucun probleme detecte.</p>
        ) : (
          <ul className="max-h-44 space-y-1 overflow-y-auto text-xs">
            {problemes.map((p, i) => (
              <li key={i} className={p.gravite === "erreur" ? "text-red-400" : "text-attenue"}>
                {p.texte}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
