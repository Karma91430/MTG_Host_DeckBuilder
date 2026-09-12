"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Paquet = { id: string; name: string; cartes: number };

/**
 * Paquets de cartes reutilisables d'un deck a l'autre.
 *
 * On enregistre une categorie entiere -- un socle de rampe, une base de
 * terrains -- pour la reverser ensuite dans un nouveau deck.
 */
export default function Paquets({
  deckId, categories,
}: { deckId: string; categories: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [paquets, setPaquets] = useState<Paquet[]>([]);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    try { setPaquets(await (await fetch("/api/packages")).json()); } catch { /* liste vide */ }
  }, []);

  useEffect(() => { if (ouvert) void charger(); }, [ouvert, charger]);

  async function enregistrer() {
    setOccupe(true);
    setMessage(null);
    try {
      const res = await fetch("/api/packages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nom, deckId, categorie: categorie || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setMessage(`« ${data.name} » enregistre.`);
      setNom("");
      void charger();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally { setOccupe(false); }
  }

  async function appliquer(p: Paquet) {
    setOccupe(true);
    const res = await fetch(`/api/packages/${p.id}/apply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId }),
    });
    const data = await res.json();
    setMessage(res.ok ? `${data.ajoutees} cartes versees depuis « ${p.name} ».`
                      : (data.error ?? "Application impossible"));
    setOccupe(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOuvert((v) => !v)}
              className="rounded-md border border-bordure px-3 py-2 text-sm">
        Paquets
      </button>

      {ouvert && (
        <div className="mt-3 w-full space-y-4 rounded-lg border border-bordure bg-panneau p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Enregistrer un paquet depuis ce deck</p>
            <div className="flex flex-wrap gap-2">
              <input value={nom} onChange={(e) => setNom(e.target.value)}
                     placeholder="Nom du paquet" className="flex-1 min-w-40 text-sm" />
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}
                      className="text-sm">
                <option value="">Tout le deck</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={enregistrer} disabled={occupe || !nom.trim()}
                      className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-texte disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-bordure pt-3">
            <p className="text-sm font-medium">Verser un paquet dans ce deck</p>
            {paquets.length === 0 ? (
              <p className="text-xs text-attenue">Aucun paquet enregistre pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-1">
                {paquets.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-attenue">{p.cartes} cartes</span>
                    <button onClick={() => appliquer(p)} disabled={occupe}
                            className="shrink-0 text-xs text-accent hover:underline">
                      verser
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {message && <p className="text-xs text-accent">{message}</p>}
          <button onClick={() => setOuvert(false)}
                  className="rounded-md border border-bordure px-3 py-1.5 text-sm">
            Fermer
          </button>
        </div>
      )}
    </>
  );
}
