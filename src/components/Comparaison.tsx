"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { symboleMana } from "@/lib/mana";
import type { Comparaison as Ecarts, LigneCarte } from "@/lib/comparaison";

/** Pourcentage arrondi : une valeur a quinze decimales fait diverger le rendu
 *  serveur du rendu navigateur, et React signale l'ecart a chaque affichage. */
const pourcent = (fraction: number) => `${Math.round(fraction * 10000) / 100}%`;

type Entete = { id: string; nom: string; format: string; note: number | null; palier: string | null };
type DeckBref = { id: string; name: string; format: string };

/**
 * Vue de comparaison.
 *
 * Trois colonnes -- ce qui est propre au premier deck, ce qu'ils partagent, ce
 * qui est propre au second -- parce que c'est ainsi qu'on lit un ecart. Les
 * chiffres sont donnes cote a cote, jamais sous forme de verdict : dire qu'un
 * deck « gagne » n'aurait pas de sens.
 */
export default function Comparaison({
  decks, a, b, ecarts,
}: {
  decks: DeckBref[];
  a: Entete | null;
  b: Entete | null;
  ecarts: Ecarts | null;
}) {
  const router = useRouter();
  const [colonne, setColonne] = useState<"tout" | "a" | "communes" | "b">("tout");

  function choisir(cote: "a" | "b", id: string) {
    const params = new URLSearchParams();
    params.set("a", cote === "a" ? id : (a?.id ?? ""));
    params.set("b", cote === "b" ? id : (b?.id ?? ""));
    router.push(`/comparer?${params}`);
  }

  const maxCourbe = Math.max(1, ...(ecarts?.courbe.flatMap((c) => [c.a, c.b]) ?? [1]));
  const maxCouleur = Math.max(1, ...(ecarts?.couleurs.flatMap((c) => [c.a, c.b]) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Comparer deux decks</h1>
        <p className="text-sm text-attenue">
          Ce qu&apos;ils partagent, ce qui les distingue, et l&apos;ecart de courbe, de mana et de prix.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((cote) => {
          const courant = cote === "a" ? a : b;
          return (
            <label key={cote} className="space-y-1 text-xs text-attenue">
              {cote === "a" ? "Premier deck" : "Second deck"}
              <select value={courant?.id ?? ""}
                      onChange={(e) => choisir(cote, e.target.value)}
                      className="w-full text-sm">
                <option value="">— choisir —</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.format})</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {!ecarts || !a || !b ? (
        <p className="rounded-xl border border-bordure bg-panneau p-12 text-center text-attenue">
          Choisis deux decks pour voir ce qui les separe.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Chiffre titre="Recouvrement" valeur={`${ecarts.recouvrement} %`}
                     detail={`${ecarts.communes.length} cartes communes sur l'union des deux listes`} />
            {ecarts.chiffres.slice(0, 3).map((c) => (
              <Chiffre key={c.nom} titre={c.nom}
                       valeur={`${c.a}${c.unite} / ${c.b}${c.unite}`}
                       detail={ecartLisible(c.a, c.b, a.nom, b.nom, c.unite)} />
            ))}
          </div>

          {(a.note !== null || b.note !== null) && (
            <div className="rounded-xl border border-bordure bg-panneau p-4">
              <h2 className="mb-2 text-sm font-medium">Puissance estimee</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[a, b].map((d) => (
                  <div key={d.id} className="rounded-lg border border-bordure bg-fond p-3">
                    <p className="truncate text-sm">{d.nom}</p>
                    <p className="text-2xl font-semibold"
                       style={d.note !== null ? { color: "var(--accent)" } : undefined}>
                      <span className={d.note === null ? "text-attenue" : undefined}>
                        {d.note !== null ? d.note.toFixed(1) : "—"}
                      </span>
                      <span className="ml-2 text-sm font-normal text-attenue">
                        {d.palier ?? "deck trop court pour etre juge"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-bordure bg-panneau p-4">
              <h2 className="mb-3 text-sm font-medium">Courbe de mana</h2>
              <div className="flex items-end gap-2" style={{ height: 150 }}>
                {ecarts.courbe.map((c) => (
                  <div key={c.cout} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-attenue">{c.a}/{c.b}</span>
                    <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 100 }}>
                      <div className="w-1/2 rounded-t"
                           style={{ height: pourcent(c.a / maxCourbe), minHeight: c.a ? 3 : 1,
                                    background: "var(--accent)" }}
                           title={`${a.nom} : ${c.a}`} />
                      <div className="w-1/2 rounded-t border border-accent"
                           style={{ height: pourcent(c.b / maxCourbe), minHeight: c.b ? 3 : 1 }}
                           title={`${b.nom} : ${c.b}`} />
                    </div>
                    <span className="text-xs text-attenue">{c.cout === 7 ? "7+" : c.cout}</span>
                  </div>
                ))}
              </div>
              <Legende a={a.nom} b={b.nom} />
            </div>

            <div className="rounded-xl border border-bordure bg-panneau p-4">
              <h2 className="mb-3 text-sm font-medium">Symboles de mana reclames</h2>
              <ul className="space-y-2">
                {ecarts.couleurs.map((c) => (
                  <li key={c.code} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={symboleMana(c.code)} alt={c.code} width={18} height={18} />
                    <span className="w-24 shrink-0 text-xs tabular-nums text-attenue">
                      {c.a} / {c.b}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="h-2 rounded-full"
                            style={{ width: pourcent(c.a / maxCouleur), minWidth: c.a ? 4 : 0,
                                     background: c.a ? "var(--accent)" : "transparent" }} />
                      <span className={`h-2 rounded-full ${c.b ? "border border-accent" : ""}`}
                            style={{ width: pourcent(c.b / maxCouleur), minWidth: c.b ? 4 : 0 }} />
                    </span>
                  </li>
                ))}
              </ul>
              <Legende a={a.nom} b={b.nom} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([["tout", "Tout"], ["a", `Propres a ${a.nom}`],
               ["communes", "Communes"], ["b", `Propres a ${b.nom}`]] as const).map(([cle, libelle]) => (
              <button key={cle} onClick={() => setColonne(cle)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        colonne === cle ? "border-accent text-accent"
                                        : "border-bordure text-attenue hover:text-texte"}`}>
                {libelle}
              </button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {(colonne === "tout" || colonne === "a") && (
              <Colonne titre={`Seulement dans ${a.nom}`} lignes={ecarts.propresA} />
            )}
            {(colonne === "tout" || colonne === "communes") && (
              <Colonne titre="Dans les deux" lignes={ecarts.communes} />
            )}
            {(colonne === "tout" || colonne === "b") && (
              <Colonne titre={`Seulement dans ${b.nom}`} lignes={ecarts.propresB} />
            )}
          </div>

          <div className="flex gap-3 text-sm">
            <Link href={`/decks/${a.id}`} className="text-accent hover:underline">
              Ouvrir {a.nom}
            </Link>
            <Link href={`/decks/${b.id}`} className="text-accent hover:underline">
              Ouvrir {b.nom}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ecartLisible(a: number, b: number, nomA: string, nomB: string, unite: string) {
  const d = Math.round((a - b) * 100) / 100;
  if (d === 0) return "identique";
  return d > 0 ? `${nomA} en compte ${d}${unite} de plus` : `${nomB} en compte ${-d}${unite} de plus`;
}

function Legende({ a, b }: { a: string; b: string }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-attenue">
      <span className="flex items-center gap-1">
        <span className="h-2 w-4 rounded" style={{ background: "var(--accent)" }} /> {a}
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-4 rounded border border-accent" /> {b}
      </span>
    </p>
  );
}

function Chiffre({ titre, valeur, detail }: { titre: string; valeur: string; detail: string }) {
  return (
    <div className="rounded-xl border border-bordure bg-panneau p-4">
      <p className="text-xl font-semibold">{valeur}</p>
      <p className="text-sm">{titre}</p>
      <p className="mt-1 text-xs text-attenue">{detail}</p>
    </div>
  );
}

function Colonne({ titre, lignes }: { titre: string; lignes: LigneCarte[] }) {
  return (
    <section className="rounded-xl border border-bordure bg-panneau p-4">
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium">
        <span className="truncate">{titre}</span>
        <span className="ml-auto shrink-0 text-attenue">{lignes.length}</span>
      </h2>
      {lignes.length === 0 ? (
        <p className="py-6 text-center text-xs text-attenue">Rien ici.</p>
      ) : (
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {lignes.map((l) => (
            <li key={l.id} className="group relative flex items-baseline gap-2 rounded px-1 py-0.5
                                      text-xs hover:bg-fond">
              <span className="w-5 shrink-0 tabular-nums text-attenue">{l.cmc}</span>
              <span className="min-w-0 flex-1 truncate">{l.nom}</span>
              <span className="shrink-0 text-attenue">
                {l.quantiteA > 0 && l.quantiteB > 0
                  ? `${l.quantiteA}/${l.quantiteB}`
                  : `×${l.quantiteA || l.quantiteB}`}
              </span>
              {l.image && (
                <img src={l.image} alt="" loading="lazy"
                     className="pointer-events-none absolute right-full top-0 z-20 hidden w-44
                                rounded-[4.75%] border border-bordure shadow-2xl group-hover:block" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
