"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Modale from "./Modale";

/** Rangement du deck : dossier et etiquettes, utiles des la dizaine de decks. */
export default function ReglagesDeck({
  deckId, folder, tags,
}: { deckId: string; folder: string; tags: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [d, setD] = useState(folder);
  const [t, setT] = useState(tags);
  const [occupe, setOccupe] = useState(false);

  async function enregistrer() {
    setOccupe(true);
    await fetch(`/api/decks/${deckId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: d.trim(), tags: t.trim() }),
    });
    setOccupe(false);
    setOuvert(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOuvert(true)}
              className="rounded-md border border-bordure px-3 py-2 text-sm">
        Rangement
      </button>
      {ouvert && (
        <Modale titre="Rangement du deck" onFermer={() => setOuvert(false)} largeur="max-w-lg">
          <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-attenue">Dossier</span>
            <input value={d} onChange={(e) => setD(e.target.value)}
                   placeholder="Commander, Essais, Precons..." className="w-full" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-attenue">Etiquettes, separees par des virgules</span>
            <input value={t} onChange={(e) => setT(e.target.value)}
                   placeholder="tokens, aristocrats, budget" className="w-full" />
          </label>
          <button onClick={enregistrer} disabled={occupe}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-texte disabled:opacity-50">
            Enregistrer
          </button>
          </div>
        </Modale>
      )}
    </>
  );
}
