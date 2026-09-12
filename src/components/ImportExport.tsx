"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Modale from "./Modale";

type Bilan = { ajoutees: number; introuvables: string[]; ignorees: string[] };

export default function ImportExport({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [remplacer, setRemplacer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function importer() {
    setOccupe(true);
    setErreur(null);
    setBilan(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte, remplacer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import impossible");
      setBilan(data);
      setTexte("");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Import impossible");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <button onClick={() => setOuvert(true)}
              className="rounded-md border border-bordure px-3 py-2 text-sm">
        Importer
      </button>
      <a href={`/api/decks/${deckId}/export`}
         className="rounded-md border border-bordure px-3 py-2 text-sm">
        Exporter
      </a>

      {ouvert && (
        <Modale titre="Importer une liste" onFermer={() => setOuvert(false)}>
          <p className="mb-2 text-xs text-attenue">
            Format « 1 Sol Ring », celui qu&apos;exportent Archidekt, Moxfield, MTGO et Arena.
            Les intitules <em>Commander</em>, <em>Sideboard</em> et <em>Maybeboard</em> sont
            reconnus et rangent les cartes qui suivent dans la bonne zone. Les mentions
            d&apos;edition entre parentheses sont ignorees.
          </p>
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={12}
            placeholder={"Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n10 Forest"}
            className="w-full font-mono text-xs"
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remplacer}
                   onChange={(e) => setRemplacer(e.target.checked)} className="h-4 w-4" />
            Remplacer le contenu actuel du deck
          </label>

          {erreur && <p className="mt-2 text-sm text-red-400">{erreur}</p>}

          {bilan && (
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-accent">{bilan.ajoutees} cartes ajoutees.</p>
              {bilan.introuvables.length > 0 && (
                <p className="text-red-400">
                  Introuvables : {bilan.introuvables.slice(0, 8).join(", ")}
                  {bilan.introuvables.length > 8 && ` (+${bilan.introuvables.length - 8})`}
                </p>
              )}
              {bilan.ignorees.length > 0 && (
                <p className="text-attenue">
                  Lignes ignorees : {bilan.ignorees.slice(0, 4).join(" · ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-3">
            <button onClick={importer} disabled={occupe || !texte.trim()}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-texte disabled:opacity-50">
              {occupe ? "Import en cours..." : "Importer"}
            </button>
          </div>
        </Modale>
      )}
    </>
  );
}
