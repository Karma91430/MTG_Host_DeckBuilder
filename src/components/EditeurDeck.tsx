"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Carte } from "@/lib/scryfall";
import { categorieType, type EntreeResolue, type Stats, type Probleme } from "@/lib/deck";
import { THEMES, symboleExtension, theme } from "@/lib/themes";
import RechercheCartes from "./RechercheCartes";
import Statistiques from "./Statistiques";

type Deck = { id: string; name: string; format: string; description: string; theme: string };

const ORDRE = ["Commandant", "Creatures", "Planeswalkers", "Ephemeres", "Rituels",
               "Artefacts", "Enchantements", "Batailles", "Terrains", "Autres"];

export default function EditeurDeck({
  deck, entrees, stats, problemes,
}: { deck: Deck; entrees: EntreeResolue[]; stats: Stats; problemes: Probleme[] }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<EntreeResolue | null>(null);

  const groupes = useMemo(() => {
    const g = new Map<string, EntreeResolue[]>();
    for (const e of entrees) {
      if (e.zone === "maybe") continue;
      const cat = e.zone === "command" ? "Commandant" : categorieType(e.carte);
      (g.get(cat) ?? g.set(cat, []).get(cat)!).push(e);
    }
    for (const liste of g.values()) liste.sort((a, b) => a.carte.name.localeCompare(b.carte.name));
    return [...g.entries()].sort((a, b) => ORDRE.indexOf(a[0]) - ORDRE.indexOf(b[0]));
  }, [entrees]);

  const aVoir = entrees.filter((e) => e.zone === "maybe");

  async function ajouter(carte: Carte, zone: string) {
    setOccupe(true);
    await fetch(`/api/decks/${deck.id}/cards`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: carte.id, zone, quantity: 1 }),
    });
    setOccupe(false);
    router.refresh();
  }

  async function modifier(entryId: string, champs: Record<string, unknown>) {
    setOccupe(true);
    await fetch(`/api/decks/${deck.id}/cards`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, ...champs }),
    });
    setOccupe(false);
    router.refresh();
  }

  async function changerTheme(id: string) {
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: id }),
    });
    router.refresh();
  }

  const t = theme(deck.theme);
  const erreurs = problemes.filter((p) => p.gravite === "erreur");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={symboleExtension(t.set)} alt="" width={28} height={28} className="symbole-extension" />
        <div>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          <p className="text-sm capitalize text-attenue">
            {deck.format} · {stats.total} cartes
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={deck.theme} onChange={(e) => void changerTheme(e.target.value)}
                  className="text-sm" title="Identite visuelle">
            {THEMES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </select>
          <Link href={`/decks/${deck.id}/playtest`}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-texte">
            Tester le deck
          </Link>
          <Link href="/" className="rounded-md border border-bordure px-3 py-2 text-sm">
            Retour
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr_16rem]">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Ajouter des cartes</h2>
          <RechercheCartes onAjouter={ajouter} />
        </section>

        <section className={`space-y-4 ${occupe ? "opacity-60" : ""}`}>
          {groupes.length === 0 ? (
            <p className="rounded-lg border border-bordure bg-panneau p-8 text-center text-attenue">
              Deck vide. Cherche une carte a gauche pour commencer.
            </p>
          ) : (
            groupes.map(([cat, liste]) => (
              <div key={cat}>
                <h3 className="mb-1 text-sm font-medium">
                  {cat}
                  <span className="ml-2 text-attenue">
                    {liste.reduce((s, e) => s + e.quantity, 0)}
                  </span>
                </h3>
                <ul className="divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-panneau">
                  {liste.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm"
                        onMouseEnter={() => setApercu(e)}>
                      <span className="w-6 shrink-0 text-right text-attenue">{e.quantity}</span>
                      <span className="min-w-0 flex-1 truncate">{e.carte.name}</span>
                      <span className="shrink-0 text-xs text-attenue">{e.carte.mana_cost}</span>
                      <button onClick={() => void modifier(e.id, { quantity: e.quantity + 1 })}
                              className="px-1 text-attenue hover:text-texte" title="Ajouter">+</button>
                      <button onClick={() => void modifier(e.id, { quantity: e.quantity - 1 })}
                              className="px-1 text-attenue hover:text-red-400" title="Retirer">−</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {aVoir.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-medium">
                A voir <span className="ml-2 text-attenue">{aVoir.length}</span>
              </h3>
              <ul className="divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-panneau">
                {aVoir.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-attenue">{e.carte.name}</span>
                    <button onClick={() => void modifier(e.id, { zone: "main" })}
                            className="text-xs text-accent">vers le deck</button>
                    <button onClick={() => void modifier(e.id, { quantity: 0 })}
                            className="px-1 text-attenue hover:text-red-400">×</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {apercu && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu.carte.image_uris?.normal ?? apercu.carte.card_faces?.[0]?.image_uris?.normal ?? ""}
                 alt={apercu.carte.name} className="w-full rounded-[4.75%] border border-bordure" />
          )}
          <Statistiques stats={stats} />
          <div className="rounded-lg border border-bordure bg-panneau p-4">
            <p className="mb-2 text-sm font-medium">
              Legalite {erreurs.length === 0 && <span className="text-accent">· conforme</span>}
            </p>
            {problemes.length === 0 ? (
              <p className="text-sm text-attenue">Aucun probleme detecte.</p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                {problemes.map((p, i) => (
                  <li key={i} className={p.gravite === "erreur" ? "text-red-400" : "text-attenue"}>
                    {p.texte}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
