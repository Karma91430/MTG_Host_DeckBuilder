"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { theme, symboleExtension } from "@/lib/themes";

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

  const dossiers = useMemo(
    () => [...new Set(decks.map((d) => d.folder).filter(Boolean))].sort(), [decks]);
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
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg border border-bordure bg-panneau p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
                 placeholder="Filtrer par nom" className="w-56 text-sm" />
          <select value={dossier} onChange={(e) => setDossier(e.target.value)} className="text-sm">
            <option value="">Tous les dossiers</option>
            {dossiers.map((d) => <option key={d} value={d}>{d}</option>)}
            <option value={SANS_DOSSIER}>{SANS_DOSSIER}</option>
          </select>
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

      {filtres.length === 0 ? (
        <p className="rounded-xl border border-bordure bg-panneau p-12 text-center text-attenue">
          Aucun deck ne correspond a ce filtre.
        </p>
      ) : (
        groupes.map(([nomDossier, liste]) => (
          <section key={nomDossier || "_"} className="space-y-3">
            {groupes.length > 1 && (
              <h2 className="text-sm uppercase tracking-wide text-attenue">
                {nomDossier || SANS_DOSSIER}
              </h2>
            )}
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {liste.map((d) => {
                const t = theme(d.theme);
                return (
                  <li key={d.id} className="relative">
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

                    <button onClick={() => setRange(d)} title="Ranger ce deck"
                            className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white
                                       opacity-0 transition hover:bg-black/90 focus:opacity-100
                                       group-hover:opacity-100 [li:hover_&]:opacity-100">
                      Ranger
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
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
