"use client";

import { useCallback, useMemo, useState } from "react";

export type CarteJeu = {
  uid: string; nom: string; image: string | null;
  typeLigne: string; cmc: number; engagee: boolean;
};

type Zone = "bibliotheque" | "main" | "terrain" | "cimetiere" | "exil" | "commandement";

const LIBELLES: Record<Zone, string> = {
  bibliotheque: "Bibliotheque", main: "Main", terrain: "Champ de bataille",
  cimetiere: "Cimetiere", exil: "Exil", commandement: "Commandement",
};

/** Melange de Fisher-Yates : chaque ordre est equiprobable. */
function melanger<T>(liste: T[]): T[] {
  const t = [...liste];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

export default function Playtest({
  bibliotheque: depart, commandants,
}: { bibliotheque: CarteJeu[]; commandants: CarteJeu[] }) {
  const [zones, setZones] = useState<Record<Zone, CarteJeu[]>>(() => ({
    bibliotheque: melanger(depart), main: [], terrain: [],
    cimetiere: [], exil: [], commandement: commandants,
  }));
  const [tour, setTour] = useState(1);
  const [vies, setVies] = useState(commandants.length > 0 ? 40 : 20);
  const [mulligans, setMulligans] = useState(0);
  const [journal, setJournal] = useState<string[]>([]);
  const [survol, setSurvol] = useState<CarteJeu | null>(null);

  const noter = useCallback((texte: string) => {
    setJournal((j) => [`T${tour} · ${texte}`, ...j].slice(0, 40));
  }, [tour]);

  const piocher = useCallback((n = 1) => {
    setZones((z) => {
      const tirees = z.bibliotheque.slice(0, n);
      if (tirees.length === 0) return z;
      return { ...z, bibliotheque: z.bibliotheque.slice(n), main: [...z.main, ...tirees] };
    });
    noter(n === 1 ? "pioche une carte" : `pioche ${n} cartes`);
  }, [noter]);

  const nouvelleMain = useCallback((garde: number) => {
    setZones((z) => {
      const tout = melanger([...z.bibliotheque, ...z.main, ...z.terrain, ...z.cimetiere, ...z.exil]);
      return { ...z, bibliotheque: tout.slice(garde), main: tout.slice(0, garde),
               terrain: [], cimetiere: [], exil: [] };
    });
    setTour(1);
  }, []);

  const deplacer = useCallback((uid: string, vers: Zone, dessous = false) => {
    setZones((z) => {
      let carte: CarteJeu | undefined;
      const suivant = { ...z };
      for (const zone of Object.keys(z) as Zone[]) {
        const i = z[zone].findIndex((c) => c.uid === uid);
        if (i >= 0) {
          carte = z[zone][i];
          suivant[zone] = [...z[zone].slice(0, i), ...z[zone].slice(i + 1)];
          break;
        }
      }
      if (!carte) return z;
      // Une carte quittant le champ de bataille revient toujours degagee.
      const propre = { ...carte, engagee: vers === "terrain" ? carte.engagee : false };
      suivant[vers] = dessous ? [...suivant[vers], propre] : [propre, ...suivant[vers]];
      return suivant;
    });
  }, []);

  const basculerEngagement = useCallback((uid: string) => {
    setZones((z) => ({
      ...z,
      terrain: z.terrain.map((c) => (c.uid === uid ? { ...c, engagee: !c.engagee } : c)),
    }));
  }, []);

  const tourSuivant = useCallback(() => {
    setZones((z) => ({ ...z, terrain: z.terrain.map((c) => ({ ...c, engagee: false })) }));
    setTour((t) => t + 1);
    piocher(1);
  }, [piocher]);

  const terrainsEngages = useMemo(
    () => zones.terrain.filter((c) => c.engagee).length, [zones.terrain]);

  const bouton = "rounded-md border border-bordure px-3 py-1.5 text-sm hover:brightness-125";

  return (
    <div className="space-y-4" onMouseLeave={() => setSurvol(null)}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-bordure bg-panneau p-3">
        <span className="text-sm">Tour <strong>{tour}</strong></span>
        <span className="flex items-center gap-1 text-sm">
          Vies
          <button onClick={() => setVies((v) => v - 1)} className="px-1 text-attenue">−</button>
          <strong>{vies}</strong>
          <button onClick={() => setVies((v) => v + 1)} className="px-1 text-attenue">+</button>
        </span>
        <span className="text-sm text-attenue">
          {zones.bibliotheque.length} en bibliotheque · {terrainsEngages} engagees
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <button className={bouton} onClick={() => piocher(1)}>Piocher</button>
          <button className={bouton} onClick={tourSuivant}>Tour suivant</button>
          <button className={bouton}
                  onClick={() => { nouvelleMain(7); setMulligans(0); noter("nouvelle partie"); }}>
            Nouvelle main
          </button>
          <button className={bouton}
                  onClick={() => {
                    const g = Math.max(1, 7 - mulligans - 1);
                    nouvelleMain(7);
                    setMulligans((m) => m + 1);
                    noter(`mulligan — ${g} carte(s) a garder`);
                  }}>
            Mulligan {mulligans > 0 && `(${mulligans})`}
          </button>
        </div>
      </div>

      {mulligans > 0 && (
        <p className="text-xs text-attenue">
          Regle de Londres : tu pioches sept cartes puis en remets {mulligans} sous la
          bibliotheque. Utilise « au-dessous » sur les cartes a rendre.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <Rangee titre="terrain" cartes={zones.terrain} zone="terrain"
                  onCarte={basculerEngagement} onDeplacer={deplacer} onSurvol={setSurvol} />
          <div className="grid gap-4 sm:grid-cols-3">
            {(["cimetiere", "exil", "commandement"] as Zone[]).map((z) => (
              <Rangee key={z} titre={z} cartes={zones[z]} zone={z} compact
                      onDeplacer={deplacer} onSurvol={setSurvol} />
            ))}
          </div>
          <Rangee titre="main" cartes={zones.main} zone="main"
                  onDeplacer={deplacer} onSurvol={setSurvol} />
        </div>

        <aside className="space-y-3">
          {survol?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={survol.image} alt={survol.nom}
                 className="w-full rounded-[4.75%] border border-bordure" />
          )}
          <div className="rounded-lg border border-bordure bg-panneau p-3">
            <p className="mb-2 text-sm font-medium">Journal</p>
            <ul className="max-h-64 space-y-0.5 overflow-y-auto text-xs text-attenue">
              {journal.length === 0 ? <li>Rien pour l&apos;instant.</li>
                : journal.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Rangee({
  titre, cartes, zone, compact = false, onCarte, onDeplacer, onSurvol,
}: {
  titre: string; cartes: CarteJeu[]; zone: Zone; compact?: boolean;
  onCarte?: (uid: string) => void;
  onDeplacer: (uid: string, vers: Zone, dessous?: boolean) => void;
  onSurvol: (c: CarteJeu | null) => void;
}) {
  const destinations: { z: Zone; libelle: string }[] = [
    { z: "terrain", libelle: "jouer" }, { z: "main", libelle: "main" },
    { z: "cimetiere", libelle: "cimetiere" }, { z: "exil", libelle: "exil" },
    { z: "bibliotheque", libelle: "dessous" },
  ];

  return (
    <div className="rounded-lg border border-bordure bg-panneau p-3">
      <p className="mb-2 text-sm font-medium">
        {LIBELLES[zone] ?? titre} <span className="text-attenue">{cartes.length}</span>
      </p>
      {cartes.length === 0 ? (
        <p className="py-4 text-center text-xs text-attenue">vide</p>
      ) : (
        <ul className={`flex flex-wrap gap-2 ${compact ? "max-h-28 overflow-y-auto" : ""}`}>
          {cartes.map((c) => (
            <li key={c.uid} className="group relative" onMouseEnter={() => onSurvol(c)}>
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.nom} loading="lazy"
                     onClick={() => onCarte?.(c.uid)}
                     className={`rounded-[4.75%] border border-bordure transition-transform ${
                       onCarte ? "cursor-pointer" : ""
                     } ${c.engagee ? "rotate-90" : ""}`}
                     style={{ width: compact ? 54 : 88 }} />
              ) : (
                <span className="block rounded border border-bordure p-1 text-[10px]">{c.nom}</span>
              )}
              <div className="absolute left-0 top-full z-10 hidden flex-col gap-0.5 rounded
                              border border-bordure bg-panneau p-1 group-hover:flex">
                {destinations.filter((d) => d.z !== zone).map((d) => (
                  <button key={d.z} onClick={() => onDeplacer(c.uid, d.z, d.z === "bibliotheque")}
                          className="whitespace-nowrap px-2 py-0.5 text-left text-[11px] hover:text-accent">
                    {d.libelle}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
