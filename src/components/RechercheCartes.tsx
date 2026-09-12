"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Carte } from "@/lib/scryfall";

const EXEMPLES = [
  { texte: "t:creature c:g cmc<=3", aide: "creatures vertes a 3 manas ou moins" },
  { texte: "o:'draw a card' t:instant", aide: "ephemeres qui piochent" },
  { texte: "is:commander c:ur", aide: "commandants bleu-rouge" },
];

export default function RechercheCartes({
  onAjouter,
}: {
  onAjouter: (carte: Carte, zone: string) => void;
}) {
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<Carte[]>([]);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dernier = useRef(0);

  const lancer = useCallback(async (q: string) => {
    if (!q.trim()) { setResultats([]); setTotal(0); setErreur(null); return; }
    const jeton = ++dernier.current;
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      // Une reponse arrivee apres une frappe plus recente est ignoree : sans
      // ce garde, un resultat lent ecraserait la recherche en cours.
      if (jeton !== dernier.current) return;
      if (!res.ok) throw new Error(data.error ?? "Recherche impossible");
      setResultats(data.data ?? []);
      setTotal(data.total_cards ?? 0);
    } catch (err) {
      if (jeton === dernier.current) setErreur(err instanceof Error ? err.message : "Erreur");
    } finally {
      if (jeton === dernier.current) setChargement(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void lancer(requete), 350);
    return () => clearTimeout(t);
  }, [requete, lancer]);

  return (
    <div className="space-y-3">
      <input
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        placeholder="Rechercher une carte — syntaxe Scryfall acceptee"
        className="w-full"
      />

      {!requete && (
        <ul className="space-y-1 text-xs text-attenue">
          {EXEMPLES.map((e) => (
            <li key={e.texte}>
              <button onClick={() => setRequete(e.texte)} className="text-accent hover:underline">
                {e.texte}
              </button>
              {" — "}{e.aide}
            </li>
          ))}
        </ul>
      )}

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}
      {chargement && <p className="text-sm text-attenue">Recherche...</p>}

      {resultats.length > 0 && (
        <>
          <p className="text-xs text-attenue">
            {resultats.length} affichees sur {total}
          </p>
          <ul className="grid max-h-[32rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {resultats.map((c) => {
              const img = c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small;
              return (
                <li key={c.id} className="group relative">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={c.name} loading="lazy"
                         className="w-full rounded-[4.75%] border border-bordure" />
                  ) : (
                    <div className="rounded border border-bordure p-2 text-xs">{c.name}</div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                                  rounded-[4.75%] bg-black/75 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onAjouter(c, "main")}
                            className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-texte">
                      Ajouter
                    </button>
                    <button onClick={() => onAjouter(c, "command")}
                            className="rounded border border-white/40 px-2 py-0.5 text-[11px] text-white">
                      Commandant
                    </button>
                    <button onClick={() => onAjouter(c, "maybe")}
                            className="rounded border border-white/40 px-2 py-0.5 text-[11px] text-white">
                      A voir
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
