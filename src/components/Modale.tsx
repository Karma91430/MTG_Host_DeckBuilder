"use client";

import { useEffect } from "react";

/**
 * Fenetre modale centree.
 *
 * Les formulaires qui s'ouvraient a meme la barre d'outils en disloquaient la
 * mise en page : tout ce qui reclame des champs supplementaires passe par ici.
 */
export default function Modale({
  titre, children, onFermer, largeur = "max-w-2xl",
}: {
  titre: string; children: React.ReactNode;
  onFermer: () => void; largeur?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onFermer]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6"
         onClick={onFermer}>
      <div className={`w-full ${largeur} rounded-xl border border-bordure bg-panneau shadow-2xl`}
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-bordure px-5 py-3">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <button onClick={onFermer}
                  className="ml-auto rounded-md border border-bordure px-3 py-1 text-sm">
            Fermer
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
