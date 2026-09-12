"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { THEMES, theme, symboleExtension } from "@/lib/themes";
import NouveauDeck from "./NouveauDeck";

export type LigneDeck = {
  id: string; name: string; format: string; theme: string;
  folder: string; tags: string; updated_at: string;
  cartes: number; art: string | null; commandant: string | null;
};

const SANS_DOSSIER = "Sans dossier";

export default function ListeDecks({ decks }: { decks: LigneDeck[] }) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [dossier, setDossier] = useState("");
  const [etiquette, setEtiquette] = useState("");
  const [format, setFormat] = useState("");
  const [range, setRange] = useState<LigneDeck | null>(null);
  const [dossiersDeclares, setDossiersDeclares] = useState<string[]>([]);
  const [nouveau, setNouveau] = useState("");
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [survole, setSurvole] = useState<string | null>(null);
  const [menuDeck, setMenuDeck] = useState<string | null>(null);
  const [renomme, setRenomme] = useState<LigneDeck | null>(null);

  const chargerDossiers = useCallback(async () => {
    try { setDossiersDeclares(await (await fetch("/api/folders")).json()); }
    catch { /* la liste se deduira des decks */ }
  }, []);
  useEffect(() => { void chargerDossiers(); }, [chargerDossiers]);

  // Les dossiers declares s'ajoutent a ceux deja portes par un deck, pour
  // qu'un dossier fraichement cree apparaisse meme s'il est encore vide.
  const dossiers = useMemo(
    () => [...new Set([...decks.map((d) => d.folder).filter(Boolean), ...dossiersDeclares])].sort(),
    [decks, dossiersDeclares]);
  const etiquettes = useMemo(() => {
    const t = new Set<string>();
    for (const d of decks) {
      for (const x of d.tags.split(",").map((s) => s.trim()).filter(Boolean)) t.add(x);
    }
    return [...t].sort();
  }, [decks]);
  const formats = useMemo(
    () => [...new Set(decks.map((d) => d.format))].sort(), [decks]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return decks.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (dossier === SANS_DOSSIER ? d.folder !== "" : dossier && d.folder !== dossier) return false;
      if (etiquette && !d.tags.split(",").map((s) => s.trim()).includes(etiquette)) return false;
      if (format && d.format !== format) return false;
      return true;
    });
  }, [decks, recherche, dossier, etiquette, format]);

  // Les decks sans dossier forment un groupe final, plutot qu'un dossier vide.
  const groupes = useMemo(() => {
    const m = new Map<string, LigneDeck[]>();
    for (const d of filtres) {
      const cle = d.folder || "";
      if (!m.has(cle)) m.set(cle, []);
      m.get(cle)!.push(d);
    }
    return [...m.entries()].sort((a, b) => {
      if (!a[0]) return 1;
      if (!b[0]) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtres]);

  /** Depot d'un deck sur un dossier : son rangement change aussitot. */
  async function deposer(deckId: string, folder: string) {
    setSurvole(null);
    await fetch(`/api/decks/${deckId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    router.refresh();
  }

  async function creerDossier() {
    const nom = nouveau.trim();
    if (!nom) return;
    await fetch("/api/folders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nom }),
    });
    setNouveau("");
    setSaisieOuverte(false);
    void chargerDossiers();
  }

  async function supprimerDossier(nom: string) {
    await fetch(`/api/folders?name=${encodeURIComponent(nom)}`, { method: "DELETE" });
    if (dossier === nom) setDossier("");
    void chargerDossiers();
    router.refresh();
  }

  async function majDeck(id: string, champs: Record<string, unknown>) {
    await fetch(`/api/decks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setMenuDeck(null);
    router.refresh();
  }

  async function supprimerDeck(deck: LigneDeck) {
    if (!window.confirm(`Supprimer « ${deck.name} » ? Cette action est definitive.`)) return;
    await fetch(`/api/decks/${deck.id}`, { method: "DELETE" });
    setMenuDeck(null);
    router.refresh();
  }

  async function ranger(deck: LigneDeck, folder: string, tags: string) {
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, tags }),
    });
    setRange(null);
    router.refresh();
  }

  const actif = Boolean(recherche || dossier || etiquette || format);
  const puce = (on: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-xs transition ${
      on ? "border-accent text-accent" : "border-bordure text-attenue hover:text-texte"}`;

  return (
    <div className="space-y-6" onClick={() => setMenuDeck(null)}>
      <div className="flex flex-wrap items-center gap-3">
        <NouveauDeck />
        {saisieOuverte ? (
          <span className="flex items-center gap-2 rounded-lg border border-accent bg-panneau px-3 py-2">
            <input autoFocus value={nouveau} onChange={(e) => setNouveau(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") void creerDossier();
                                       if (e.key === "Escape") setSaisieOuverte(false); }}
                   placeholder="Nom du dossier" className="w-48 text-sm" />
            <button onClick={creerDossier}
                    className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-texte">
              Creer
            </button>
          </span>
        ) : (
          <button onClick={() => setSaisieOuverte(true)}
                  className="flex items-center gap-2 rounded-lg border border-bordure bg-panneau
                             px-4 py-2 font-medium hover:border-accent hover:text-accent">
            <span className="text-xl leading-none">+</span> Nouveau dossier
          </button>
        )}
      </div>

      {/* Le bloc de filtres n'a de sens qu'une fois des decks presents. */}
      {decks.length > 0 && (
      <div className="space-y-2 rounded-lg border border-bordure bg-panneau p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
                 placeholder="Filtrer par nom" className="w-56 text-sm" />
          <select value={format} onChange={(e) => setFormat(e.target.value)}
                  className="text-sm capitalize">
            <option value="">Tous formats</option>
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="text-sm text-attenue">
            {filtres.length} deck{filtres.length > 1 ? "s" : ""}
          </span>
          {actif && (
            <button onClick={() => { setRecherche(""); setDossier(""); setEtiquette(""); setFormat(""); }}
                    className="text-sm text-accent hover:underline">
              effacer
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-bordure pt-2">
          <span className="text-xs text-attenue">Dossiers</span>
          <Cible actif={dossier === ""} survole={false}
                 onClic={() => setDossier("")} libelle="Tous" />
          {dossiers.map((d) => (
            <Cible key={d} actif={dossier === d} survole={survole === d}
                   onClic={() => setDossier(dossier === d ? "" : d)}
                   onDepot={(id) => deposer(id, d)}
                   onSurvol={(v) => setSurvole(v ? d : null)}
                   onSupprimer={() => supprimerDossier(d)}
                   libelle={d}
                   compte={decks.filter((x) => x.folder === d).length} />
          ))}
          <Cible actif={dossier === SANS_DOSSIER} survole={survole === ""}
                 onClic={() => setDossier(dossier === SANS_DOSSIER ? "" : SANS_DOSSIER)}
                 onDepot={(id) => deposer(id, "")}
                 onSurvol={(v) => setSurvole(v ? "" : null)}
                 libelle={SANS_DOSSIER}
                 compte={decks.filter((x) => !x.folder).length} />

          <span className="text-[11px] text-attenue">
            Fais glisser un deck sur un dossier pour l&apos;y ranger.
          </span>
        </div>

        {etiquettes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {etiquettes.map((t) => (
              <button key={t} onClick={() => setEtiquette(etiquette === t ? "" : t)}
                      className={puce(etiquette === t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {filtres.length === 0 ? (
        <div className="rounded-xl border border-bordure bg-panneau p-12 text-center">
          <p className="text-attenue">
            {decks.length === 0
              ? "Aucun deck pour l'instant."
              : "Aucun deck ne correspond a ce filtre."}
          </p>
          {decks.length === 0 && (
            <p className="mt-1 text-sm text-attenue">
              Cree ton premier deck et choisis son identite visuelle.
            </p>
          )}
        </div>
      ) : (
        groupes.map(([nomDossier, liste]) => (
          <section key={nomDossier || "_"} className="space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setSurvole(nomDossier); }}
              onDragLeave={() => setSurvole(null)}
              onDrop={(e) => { e.preventDefault();
                               deposer(e.dataTransfer.getData("text/plain"), nomDossier); }}
              className={`flex items-baseline gap-3 rounded-lg border-l-4 px-3 py-1.5 transition ${
                survole === nomDossier
                  ? "border-l-accent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "border-l-bordure"}`}>
              <h2 className="text-base font-medium">{nomDossier || SANS_DOSSIER}</h2>
              <span className="text-sm text-attenue">
                {liste.length} deck{liste.length > 1 ? "s" : ""}
              </span>
              <span className="ml-auto text-[11px] text-attenue">
                deposer un deck ici pour l&apos;y ranger
              </span>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {liste.map((d) => {
                const t = theme(d.theme);
                return (
                  <li key={d.id} className="relative" draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}>
                    <Link href={`/decks/${d.id}`}
                          className="group block overflow-hidden rounded-xl border shadow-lg transition
                                     hover:-translate-y-0.5 hover:shadow-xl"
                          style={{ borderColor: t.couleurs.bordure, background: t.couleurs.panneau }}>
                      <div className="relative h-52 overflow-hidden" style={{ background: t.couleurs.fond }}>
                        {d.art && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.art} alt="" loading="lazy"
                               className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        )}
                        <div className="absolute inset-0"
                             style={{ background: `linear-gradient(to top, ${t.couleurs.panneau} 4%, transparent 45%)` }} />
                        <div className="absolute left-3 top-2 flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={symboleExtension(t.set)} alt="" width={18} height={18}
                               className="symbole-extension" />
                          <span className="text-[11px] uppercase tracking-wide drop-shadow"
                                style={{ color: t.couleurs.accent }}>{t.nom}</span>
                        </div>
                      </div>
                      <div className="space-y-1 p-4 pt-3">
                        <p className="truncate text-lg font-semibold" style={{ color: t.couleurs.texte }}>
                          {d.name}
                        </p>
                        <p className="truncate text-sm capitalize" style={{ color: t.couleurs.attenue }}>
                          {d.format} · {d.cartes} cartes
                          {d.commandant && ` · ${d.commandant}`}
                        </p>
                        {d.tags && (
                          <p className="flex flex-wrap gap-1 pt-1">
                            {d.tags.split(",").map((x) => x.trim()).filter(Boolean).map((x) => (
                              <span key={x} className="rounded-full px-2 py-0.5 text-[11px]"
                                    style={{ border: `1px solid ${t.couleurs.bordure}`,
                                             color: t.couleurs.attenue }}>{x}</span>
                            ))}
                          </p>
                        )}
                      </div>
                    </Link>

                    <button onClick={(e) => { e.stopPropagation();
                                              setMenuDeck(menuDeck === d.id ? null : d.id); }}
                            title="Reglages du deck"
                            className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-sm
                                       leading-none text-white opacity-0 transition hover:bg-black/90
                                       [li:hover_&]:opacity-100"
                            style={menuDeck === d.id ? { opacity: 1 } : undefined}>
                      ⋯
                    </button>

                    {menuDeck === d.id && (
                      <div className="absolute right-2 top-10 z-20 w-52 rounded-md border border-bordure
                                      bg-panneau py-1 shadow-2xl"
                           onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setRange(d); setMenuDeck(null); }}
                                className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
                          Dossier et etiquettes
                        </button>
                        <button onClick={() => { setRenomme(d); setMenuDeck(null); }}
                                className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
                          Renommer
                        </button>
                        <div className="border-t border-bordure pt-1">
                          <p className="px-3 py-0.5 text-[10px] uppercase tracking-wide text-attenue">
                            Identite visuelle
                          </p>
                          <div className="max-h-40 overflow-y-auto">
                            {THEMES.map((x) => (
                              <button key={x.id} onClick={() => void majDeck(d.id, { theme: x.id })}
                                      className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs
                                                  hover:text-accent ${d.theme === x.id ? "text-accent" : ""}`}>
                                <span className="h-2.5 w-2.5 rounded-full"
                                      style={{ background: x.couleurs.accent }} />
                                {x.nom}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => supprimerDeck(d)}
                                className="mt-1 block w-full border-t border-bordure px-3 py-1.5 text-left
                                           text-xs text-attenue hover:text-red-400">
                          Supprimer le deck
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {renomme && (
        <Renommer deck={renomme}
                  onValider={(nom) => { void majDeck(renomme.id, { name: nom }); setRenomme(null); }}
                  onFermer={() => setRenomme(null)} />
      )}

      {range && (
        <Rangement deck={range} dossiers={dossiers}
                   onValider={ranger} onFermer={() => setRange(null)} />
      )}
    </div>
  );
}

/** Attribution d'un dossier et d'etiquettes sans ouvrir le deck. */
function Rangement({
  deck, dossiers, onValider, onFermer,
}: {
  deck: LigneDeck; dossiers: string[];
  onValider: (d: LigneDeck, folder: string, tags: string) => void;
  onFermer: () => void;
}) {
  const [folder, setFolder] = useState(deck.folder);
  const [tags, setTags] = useState(deck.tags);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-6" onClick={onFermer}>
      <div className="w-full max-w-lg rounded-xl border border-bordure bg-panneau p-5"
           onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Ranger « {deck.name} »</h2>

        <label className="mb-3 block space-y-1 text-sm">
          <span className="text-attenue">Dossier</span>
          <input value={folder} onChange={(e) => setFolder(e.target.value)}
                 list="dossiers-existants" placeholder="Commander, Essais, Precons..."
                 className="w-full" />
          <datalist id="dossiers-existants">
            {dossiers.map((d) => <option key={d} value={d} />)}
          </datalist>
          <span className="block text-xs text-attenue">
            Saisir un nom inexistant cree le dossier.
          </span>
        </label>

        <label className="mb-4 block space-y-1 text-sm">
          <span className="text-attenue">Etiquettes, separees par des virgules</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
                 placeholder="tokens, aristocrats, budget" className="w-full" />
        </label>

        <div className="flex gap-2">
          <button onClick={() => onValider(deck, folder.trim(), tags.trim())}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-texte">
            Enregistrer
          </button>
          <button onClick={onFermer} className="rounded-md border border-bordure px-4 py-1.5 text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}


/** Dossier du rail : filtre au clic, accepte le depot d'un deck. */
function Cible({
  libelle, compte, actif, survole, onClic, onDepot, onSurvol, onSupprimer,
}: {
  libelle: string; compte?: number; actif: boolean; survole: boolean;
  onClic: () => void;
  onDepot?: (deckId: string) => void;
  onSurvol?: (dessus: boolean) => void;
  onSupprimer?: () => void;
}) {
  return (
    <span
      onDragOver={(e) => { if (onDepot) { e.preventDefault(); onSurvol?.(true); } }}
      onDragLeave={() => onSurvol?.(false)}
      onDrop={(e) => { if (!onDepot) return;
                       e.preventDefault(); onDepot(e.dataTransfer.getData("text/plain")); }}
      className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition ${
        survole ? "border-accent bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-accent"
        : actif ? "border-accent text-accent"
        : "border-bordure text-attenue hover:text-texte"}`}
    >
      <button onClick={onClic}>{libelle}</button>
      {compte !== undefined && <span className="opacity-60">{compte}</span>}
      {onSupprimer && (
        <button onClick={onSupprimer} title="Supprimer le dossier — les decks en sortent"
                className="hidden text-attenue hover:text-red-400 group-hover:inline">
          ×
        </button>
      )}
    </span>
  );
}


/** Renommage d'un deck depuis l'ecran principal. */
function Renommer({
  deck, onValider, onFermer,
}: { deck: LigneDeck; onValider: (nom: string) => void; onFermer: () => void }) {
  const [nom, setNom] = useState(deck.name);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-6" onClick={onFermer}>
      <div className="w-full max-w-md rounded-xl border border-bordure bg-panneau p-5"
           onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">Renommer le deck</h2>
        <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter" && nom.trim()) onValider(nom.trim()); }}
               className="mb-4 w-full" />
        <div className="flex gap-2">
          <button onClick={() => nom.trim() && onValider(nom.trim())}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-texte">
            Enregistrer
          </button>
          <button onClick={onFermer} className="rounded-md border border-bordure px-4 py-1.5 text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
