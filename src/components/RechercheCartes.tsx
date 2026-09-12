"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Carte } from "@/lib/carte";
import { imageDe } from "@/lib/carte";

const EXEMPLES = [
  { texte: "t:creature c:g cmc<=3", aide: "creatures vertes a 3 manas ou moins" },
  { texte: "o:'draw a card' t:instant", aide: "ephemeres qui piochent" },
  { texte: "is:commander c:ur", aide: "commandants bleu-rouge" },
];

export default function RechercheCartes({
  onAjouter,
}: {
  onAjouter: (carte: Carte, zone: string, quantite: number) => void;
}) {
  const [requete, setRequete] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [resultats, setResultats] = useState<Carte[]>([]);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dernier = useRef(0);
  const champ = useRef<HTMLInputElement>(null);

  // La recherche est l'action la plus repetee : elle merite un raccourci.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

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
      <div className="flex gap-2">
        <input
          ref={champ}
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          placeholder="Rechercher une carte  (Ctrl + K)"
          className="min-w-0 flex-1"
        />
        <input type="number" min={1} max={99} value={quantite}
               onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
               title="Quantite ajoutee" className="w-16" />
      </div>

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
          <p className="text-xs text-attenue">{resultats.length} affichees sur {total}</p>
          <ul className="grid max-h-[calc(100vh-18rem)] gap-2 overflow-y-auto pr-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(var(--carte-l), 1fr))" }}>
            {resultats.map((c) => (
              <li key={c.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDe(c, "normal") ?? ""} alt={c.name} loading="lazy"
                     className="w-full rounded-[4.75%] border border-bordure" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                                rounded-[4.75%] bg-black/75 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => onAjouter(c, "main", quantite)}
                          className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-texte">
                    Ajouter {quantite > 1 && `×${quantite}`}
                  </button>
                  <button onClick={() => onAjouter(c, "command", 1)}
                          className="rounded border border-white/40 px-2 py-0.5 text-[11px] text-white">
                    Commandant
                  </button>
                  <button onClick={() => onAjouter(c, "maybe", quantite)}
                          className="rounded border border-white/40 px-2 py-0.5 text-[11px] text-white">
                    A voir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
