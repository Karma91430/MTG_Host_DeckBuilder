"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Carte } from "@/lib/carte";
import { imageDe } from "@/lib/carte";
import { symboleMana, NOMS } from "@/lib/mana";

const CODES_COULEURS = ["W", "U", "B", "R", "G", "C"] as const;

const TYPES = ["creature", "instant", "sorcery", "artifact", "enchantment",
               "planeswalker", "land", "battle"];
const RARETES = [["c", "Commune"], ["u", "Inhabituelle"], ["r", "Rare"], ["m", "Mythique"]];
const TRIS = [["name", "Nom"], ["cmc", "Cout"], ["edhrec", "Popularite"],
              ["eur", "Prix"], ["released", "Sortie"]];

/**
 * Construit une requete Scryfall a partir des filtres.
 *
 * Les couleurs utilisent `id<=` plutot que `c:` : on veut ce qui est jouable
 * dans une identite donnee, pas seulement ce qui porte exactement ces couleurs.
 */
function construire(
  texte: string, couleurs: string[], type: string, rarete: string,
  cmcMin: string, cmcMax: string, format: string,
): string {
  const parts: string[] = [];
  if (texte.trim()) parts.push(texte.trim());
  if (couleurs.length) parts.push(`id<=${couleurs.join("")}`);
  if (type) parts.push(`t:${type}`);
  if (rarete) parts.push(`r:${rarete}`);
  if (cmcMin) parts.push(`cmc>=${cmcMin}`);
  if (cmcMax) parts.push(`cmc<=${cmcMax}`);
  if (format) parts.push(`f:${format}`);
  return parts.join(" ");
}

export default function RechercheCartes({
  format, onAjouter,
}: {
  format: string;
  onAjouter: (carte: Carte, zone: string, quantite: number) => void;
}) {
  const [texte, setTexte] = useState("");
  const [couleurs, setCouleurs] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [rarete, setRarete] = useState("");
  const [cmcMin, setCmcMin] = useState("");
  const [cmcMax, setCmcMax] = useState("");
  const [legalSeulement, setLegalSeulement] = useState(true);
  const [tri, setTri] = useState("name");
  const [quantite, setQuantite] = useState(1);

  const [resultats, setResultats] = useState<Carte[]>([]);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dernier = useRef(0);
  const champ = useRef<HTMLInputElement>(null);

  const requete = useMemo(
    () => construire(texte, couleurs, type, rarete, cmcMin, cmcMax,
                     legalSeulement ? format : ""),
    [texte, couleurs, type, rarete, cmcMin, cmcMax, legalSeulement, format],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault(); champ.current?.focus(); champ.current?.select();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const lancer = useCallback(async (q: string, ordre: string) => {
    if (!q.trim()) { setResultats([]); setTotal(0); setErreur(null); return; }
    const jeton = ++dernier.current;
    setChargement(true); setErreur(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&order=${ordre}`);
      const data = await res.json();
      // Une reponse arrivee apres une frappe plus recente est ignoree.
      if (jeton !== dernier.current) return;
      if (!res.ok) throw new Error(data.error ?? "Recherche impossible");
      setResultats(data.data ?? []); setTotal(data.total_cards ?? 0);
    } catch (err) {
      if (jeton === dernier.current) setErreur(err instanceof Error ? err.message : "Erreur");
    } finally {
      if (jeton === dernier.current) setChargement(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void lancer(requete, tri), 350);
    return () => clearTimeout(t);
  }, [requete, tri, lancer]);

  const basculerCouleur = (c: string) =>
    setCouleurs((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));

  const rien = !texte && couleurs.length === 0 && !type && !rarete && !cmcMin && !cmcMax;

  return (
    <div className="space-y-3 rounded-lg border border-bordure bg-panneau p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={champ} value={texte} onChange={(e) => setTexte(e.target.value)}
               placeholder="Nom, texte, ou syntaxe Scryfall  (Ctrl + K)"
               className="min-w-56 flex-1" />

        <span className="flex gap-1">
          {CODES_COULEURS.map((code) => (
            <button key={code} onClick={() => basculerCouleur(code)} title={NOMS[code]}
                    className={`rounded-full transition ${
                      couleurs.includes(code)
                        ? "scale-110 ring-2 ring-[var(--accent)]"
                        : "opacity-45 hover:opacity-85"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={symboleMana(code)} alt={NOMS[code]} width={26} height={26} className="block" />
            </button>
          ))}
        </span>

        <select value={type} onChange={(e) => setType(e.target.value)} className="text-sm capitalize">
          <option value="">Tous types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={rarete} onChange={(e) => setRarete(e.target.value)} className="text-sm">
          <option value="">Toutes raretes</option>
          {RARETES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <span className="flex items-center gap-1 text-xs text-attenue">
          Cout
          <input type="number" min={0} max={20} value={cmcMin}
                 onChange={(e) => setCmcMin(e.target.value)} placeholder="min" className="w-14" />
          <input type="number" min={0} max={20} value={cmcMax}
                 onChange={(e) => setCmcMax(e.target.value)} placeholder="max" className="w-14" />
        </span>

        <select value={tri} onChange={(e) => setTri(e.target.value)} className="text-sm">
          {TRIS.map(([v, l]) => <option key={v} value={v}>Trier : {l}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-attenue" title="Restreindre au format du deck">
          <input type="checkbox" checked={legalSeulement} className="h-3.5 w-3.5"
                 onChange={(e) => setLegalSeulement(e.target.checked)} />
          <span className="capitalize">{format}</span>
        </label>

        <span className="ml-auto flex items-center gap-1 text-xs text-attenue">
          Quantite
          <input type="number" min={1} max={99} value={quantite}
                 onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))} className="w-14" />
        </span>
      </div>

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      {rien ? (
        <p className="py-6 text-center text-sm text-attenue">
          Cherche un nom, ou combine les filtres ci-dessus.
          La syntaxe Scryfall complete est acceptee, par exemple{" "}
          <button onClick={() => setTexte("o:\"whenever you cast\"")} className="text-accent hover:underline">
            o:&quot;whenever you cast&quot;
          </button>.
        </p>
      ) : (
        <>
          <p className="text-xs text-attenue">
            {chargement ? "Recherche..." : `${resultats.length} affichees sur ${total}`}
          </p>
          <ul className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1"
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
