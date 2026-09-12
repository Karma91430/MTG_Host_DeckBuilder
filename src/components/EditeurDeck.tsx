"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { imageDe, type Carte } from "@/lib/carte";
import type { EntreeResolue, Stats, Probleme } from "@/lib/deck";
import { THEMES, symboleExtension, theme } from "@/lib/themes";
import RechercheCartes from "./RechercheCartes";
import Statistiques from "./Statistiques";
import ListeDeck from "./ListeDeck";
import ImportExport from "./ImportExport";
import FicheCarte from "./FicheCarte";
import MainDepart from "./MainDepart";
import Acquisition from "./Acquisition";
import Paquets from "./Paquets";
import ReglagesDeck from "./ReglagesDeck";

type Deck = { id: string; name: string; format: string; description: string;
              theme: string; folder: string; tags: string };

export default function EditeurDeck({
  deck, entrees, stats, problemes, art,
}: { deck: Deck; entrees: EntreeResolue[]; stats: Stats; problemes: Probleme[];
     art: string | null }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<EntreeResolue | null>(null);
  const [fiche, setFiche] = useState<EntreeResolue | null>(null);
  const [histo, setHisto] = useState({ peutAnnuler: false, peutRetablir: false });

  // L'etat des boutons suit le contenu : chaque modification rafraichit la page,
  // donc reinterroger ici suffit a les tenir a jour.
  useEffect(() => {
    void fetch(`/api/decks/${deck.id}/historique`)
      .then((r) => r.json()).then(setHisto).catch(() => {});
  }, [deck.id, entrees]);

  async function historique(action: "annuler" | "retablir") {
    setOccupe(true);
    const r = await fetch(`/api/decks/${deck.id}/historique`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setHisto(await r.json());
    setOccupe(false);
    router.refresh();
  }

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
      <header className="relative -mx-8 -mt-6 mb-6 overflow-hidden border-b border-bordure">
        {art && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {/* Voile degrade : le bandeau doit rester lisible quelle que soit
                l'illustration du commandant. */}
            <div className="absolute inset-0"
                 style={{ background: "linear-gradient(to right, var(--fond) 30%, transparent 90%)" }} />
            <div className="absolute inset-0"
                 style={{ background: "linear-gradient(to top, var(--fond) 5%, transparent 60%)" }} />
          </>
        )}
        <div className={`relative flex flex-wrap items-end gap-4 px-8 ${art ? "py-8" : "py-5"}`}>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={symboleExtension(t.set)} alt="" width={20} height={20}
                   className="symbole-extension" />
              <span className="text-xs uppercase tracking-wide text-accent">{t.nom}</span>
            </div>
            <h1 className="text-3xl font-semibold drop-shadow">{deck.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-attenue">
              <span className="capitalize">{deck.format}</span>
              <span>·</span>
              <span>{stats.total} cartes</span>
              {stats.prix > 0 && (<><span>·</span><span>~{stats.prix} €</span></>)}
              <span>·</span>
              <span className={erreurs.length === 0 ? "text-accent" : "text-red-400"}>
                {erreurs.length === 0 ? "conforme" : `${erreurs.length} probleme${erreurs.length > 1 ? "s" : ""}`}
              </span>
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select value={deck.theme} onChange={(e) => void changerTheme(e.target.value)}
                    className="text-sm" title="Identite visuelle">
              {THEMES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </select>
            <span className="flex overflow-hidden rounded-md border border-bordure bg-panneau">
              <button onClick={() => void historique("annuler")} disabled={!histo.peutAnnuler || occupe}
                      title="Annuler" className="px-3 py-2 text-sm disabled:opacity-30">↶</button>
              <button onClick={() => void historique("retablir")} disabled={!histo.peutRetablir || occupe}
                      title="Retablir" className="border-l border-bordure px-3 py-2 text-sm disabled:opacity-30">↷</button>
            </span>
            <ImportExport deckId={deck.id} />
            <Paquets deckId={deck.id}
                     categories={[...new Set(entrees.map((e) => e.category).filter(Boolean))].sort()} />
            <ReglagesDeck deckId={deck.id} folder={deck.folder} tags={deck.tags} />
            <Link href={`/decks/${deck.id}/playtest`}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-texte">
              Tester
            </Link>
            <Link href="/" className="rounded-md border border-bordure bg-panneau px-3 py-2 text-sm">
              Retour
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_17rem]">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Ajouter des cartes</h2>
          <RechercheCartes onAjouter={ajouter} />
        </section>

        <section className={occupe ? "opacity-60" : ""}>
          <ListeDeck entrees={entrees} onModifier={modifier} onSurvol={setApercu}
                     onOuvrir={setFiche} />

          {aVoir.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-medium">
                A voir <span className="ml-2 text-attenue">{aVoir.length}</span>
              </h3>
              <ul className="divide-y divide-bordure overflow-hidden rounded-lg border border-bordure bg-panneau">
                {aVoir.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm"
                      onMouseEnter={() => setApercu(e)}>
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
            <img src={imageDe(apercu.carte, "normal") ?? ""} alt={apercu.carte.name}
                 className="w-full rounded-[4.75%] border border-bordure" />
          )}
          <Statistiques stats={stats} />
          <Acquisition entrees={entrees} />
          <MainDepart entrees={entrees} />
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

      {fiche && (
        <FicheCarte entree={fiche}
                    onModifier={(id, champs) => { void modifier(id, champs); setFiche(null); }}
                    onFermer={() => setFiche(null)} />
      )}
    </div>
  );
}
