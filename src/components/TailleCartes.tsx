"use client";

import { useEffect, useState } from "react";

/**
 * Reglage de la taille des cartes, en pixels de largeur.
 *
 * Une valeur figee ne peut pas convenir a la fois a un portable et a un grand
 * ecran. Le choix est memorise et diffuse par une variable CSS, si bien que
 * toutes les vues -- colonnes, grille, recherche, playtest -- s'y alignent
 * sans qu'aucune n'ait a connaitre le reglage.
 */

const CLE = "mtg-taille-cartes";
const DEFAUT = 126;

/** Emis a chaque changement de reglage, pour les vues qui mesurent en pixels. */
export const EVENEMENT_TAILLE = "mtg-taille-cartes";

export function appliquerTaille(px: number) {
  document.documentElement.style.setProperty("--carte-l", `${px}px`);
  window.dispatchEvent(new CustomEvent(EVENEMENT_TAILLE, { detail: px }));
}

export default function TailleCartes() {
  const [taille, setTaille] = useState(DEFAUT);

  useEffect(() => {
    const memorise = Number(localStorage.getItem(CLE));
    // Sur un grand ecran, la valeur par defaut parait etriquee : on l'ajuste
    // a la premiere visite, sans jamais ecraser un choix deja fait.
    const initiale = memorise || (window.innerWidth > 2200 ? 190
                                : window.innerWidth < 1400 ? 108 : DEFAUT);
    setTaille(initiale);
    appliquerTaille(initiale);
  }, []);

  function changer(px: number) {
    setTaille(px);
    appliquerTaille(px);
    try { localStorage.setItem(CLE, String(px)); } catch { /* mode prive */ }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-attenue" title="Taille des cartes">
      <span className="hidden sm:inline">Taille</span>
      <input type="range" min={80} max={360} step={4} value={taille}
             onChange={(e) => changer(Number(e.target.value))}
             className="w-32 accent-[var(--accent)]" />
    </label>
  );
}
