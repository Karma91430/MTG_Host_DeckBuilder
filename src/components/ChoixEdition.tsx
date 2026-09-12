"use client";

import { useEffect, useState } from "react";
import type { Impression } from "@/lib/carte";

/**
 * Selecteur d'impression.
 *
 * Une carte existe souvent en dix tirages : edition d'origine, reimpression,
 * illustration alternative, cadre etendu. Le deck retient l'identifiant du
 * tirage choisi, si bien que la liste, le playtest et l'export montrent tous
 * la meme version.
 *
 * La liste n'est demandee qu'a l'ouverture du volet : elle coute une requete
 * Scryfall, inutile tant que personne ne la regarde.
 */
export default function ChoixEdition({
  cardId, actuel, onChoisir,
}: {
  cardId: string;
  actuel: string;
  onChoisir: (impressionId: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [liste, setListe] = useState<Impression[] | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    // Changer de carte referme le volet : la liste affichee ne vaudrait plus.
    setOuvert(false);
    setListe(null);
    setErreur("");
  }, [cardId]);

  useEffect(() => {
    if (!ouvert || liste !== null) return;
    let vivant = true;
    void (async () => {
      try {
        const r = await fetch(`/api/cards/${cardId}/prints`);
        const data = (await r.json()) as { impressions?: Impression[]; error?: string };
        if (!vivant) return;
        if (data.error) setErreur(data.error);
        setListe(data.impressions ?? []);
      } catch {
        if (vivant) { setErreur("Scryfall n'a pas repondu."); setListe([]); }
      }
    })();
    return () => { vivant = false; };
  }, [ouvert, liste, cardId]);

  return (
    <div>
      <button onClick={() => setOuvert((v) => !v)}
              className="text-xs text-attenue hover:text-accent">
        {ouvert ? "Masquer les editions" : "Choisir l'edition"}
      </button>

      {ouvert && (
        <div className="mt-2">
          {liste === null && <p className="text-xs text-attenue">Lecture des tirages...</p>}
          {erreur && <p className="text-xs text-red-400">{erreur}</p>}
          {liste !== null && liste.length === 0 && !erreur && (
            <p className="text-xs text-attenue">Un seul tirage connu pour cette carte.</p>
          )}
          {liste !== null && liste.length > 0 && (
            <ul className="grid max-h-72 gap-2 overflow-y-auto pr-1"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
              {liste.map((i) => {
                const choisi = i.id === actuel;
                return (
                  <li key={i.id}>
                    <button onClick={() => onChoisir(i.id)}
                            title={`${i.set_name} · #${i.collector_number}`
                                   + (i.prix ? ` · ${i.prix} €` : "")}
                            className={`block w-full overflow-hidden rounded-md border text-left transition ${
                              choisi ? "border-accent ring-1 ring-accent"
                                     : "border-bordure hover:border-accent"}`}>
                      {i.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.image} alt={i.set_name} loading="lazy" className="w-full" />
                      ) : (
                        <span className="block px-2 py-6 text-center text-[10px]">{i.set.toUpperCase()}</span>
                      )}
                      <span className="block truncate px-1.5 py-1 text-[10px] text-attenue">
                        {i.set.toUpperCase()} · {i.released_at.slice(0, 4)}
                        {i.promo && " · promo"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
