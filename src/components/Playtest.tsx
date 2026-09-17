"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TailleCartes, { EVENEMENT_TAILLE } from "./TailleCartes";

export type CarteJeu = {
  uid: string; nom: string; image: string | null;
  typeLigne: string; cmc: number; engagee: boolean;
  /** Position libre sur le champ de bataille, en pourcentage de la zone. */
  x?: number; y?: number;
  marqueurs?: number;
  jeton?: boolean;
  /** Vrai si la carte a ete posee a la main : la mise en place automatique
      ne doit plus la deplacer. */
  manuelle?: boolean;
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

const estTerrain = (c: CarteJeu) => /land|terrain/i.test(c.typeLigne);
const estPermanent = (c: CarteJeu) =>
  !/instant|sorcery|ephemere|rituel/i.test(c.typeLigne);

/** Cartes alignees par rangee avant de passer a la suivante. */
const PAR_RANGEE = 12;

/**
 * Place une carte automatiquement sur le champ de bataille.
 *
 * Les terrains s'alignent en bas, le reste au-dessus : c'est la disposition
 * qu'on adopte spontanement sur une vraie table. Les cartes deja deplacees a
 * la main sont ignorees dans le comptage, pour qu'elles ne decalent rien.
 */
function positionAuto(carte: CarteJeu, presentes: CarteJeu[]) {
  const terrain = estTerrain(carte);
  const rang = presentes.filter((c) => !c.manuelle && estTerrain(c) === terrain).length;
  const colonne = rang % PAR_RANGEE;
  const ligne = Math.floor(rang / PAR_RANGEE);
  return {
    x: 1.5 + colonne * 7.6,
    y: terrain ? 54 + ligne * 14 : 4 + ligne * 14,
  };
}

export type JetonDispo = { nom: string; typeLigne: string; image: string | null };

/** Dos de carte officiel, servi par Scryfall comme le reste des visuels. */
const DOS_DE_CARTE =
  "https://backs.scryfall.io/large/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg";

export default function Playtest({
  bibliotheque: depart, commandants, jetons = [], viesDepart = 20,
}: { bibliotheque: CarteJeu[]; commandants: CarteJeu[]; jetons?: JetonDispo[];
     viesDepart?: number }) {
  const [zones, setZones] = useState<Record<Zone, CarteJeu[]>>(() => ({
    bibliotheque: melanger(depart), main: [], terrain: [],
    cimetiere: [], exil: [], commandement: commandants,
  }));
  const [tour, setTour] = useState(1);
  const [vies, setVies] = useState(viesDepart);
  const [mulligans, setMulligans] = useState(0);
  const [menu, setMenu] = useState<{ uid: string; zone: Zone; x: number; y: number } | null>(null);
  const [panneau, setPanneau] = useState<{ titre: string; cartes: CarteJeu[] } | null>(null);
  const [menuPlateau, setMenuPlateau] = useState<{ x: number; y: number } | null>(null);
  const champ = useRef<HTMLDivElement>(null);

  // Les actions ne sont plus journalisees : le plateau parle de lui-meme, et
  // la place gagnee profite au champ de bataille.
  const noter = useCallback((_texte: string) => {}, []);

  /** Retire une carte de sa zone, quelle qu'elle soit. */
  const extraire = (etat: Record<Zone, CarteJeu[]>, uid: string) => {
    for (const z of Object.keys(etat) as Zone[]) {
      const i = etat[z].findIndex((c) => c.uid === uid);
      if (i >= 0) {
        const carte = etat[z][i];
        etat[z] = [...etat[z].slice(0, i), ...etat[z].slice(i + 1)];
        return carte;
      }
    }
    return null;
  };

  const deplacer = useCallback((uid: string, vers: Zone,
                               pos?: { x: number; y: number }, manuelle = false) => {
    setZones((z) => {
      const suivant = { ...z };
      const carte = extraire(suivant, uid);
      if (!carte) return z;
      // Un jeton qui quitte le champ de bataille cesse d'exister.
      if (carte.jeton && vers !== "terrain") return suivant;
      const propre: CarteJeu = {
        ...carte,
        engagee: vers === "terrain" ? carte.engagee : false,
        marqueurs: vers === "terrain" ? carte.marqueurs : 0,
        x: pos?.x, y: pos?.y, manuelle: pos ? manuelle : undefined,
      };
      suivant[vers] = vers === "bibliotheque"
        ? [...suivant[vers], propre]      // repose sous la bibliotheque
        : [propre, ...suivant[vers]];
      return suivant;
    });
    setMenu(null);
  }, []);

  /**
   * Joue une carte depuis la main ou la zone de commandement : les permanents rejoignent le champ de bataille
   * a une place calculee, les ephemeres et rituels partent au cimetiere comme
   * ils le feraient apres resolution.
   */
  const jouer = useCallback((uid: string) => {
    setZones((z) => {
      const suivant = { ...z };
      const carte = extraire(suivant, uid);
      if (!carte) return z;
      if (!estPermanent(carte)) {
        suivant.cimetiere = [{ ...carte, engagee: false }, ...suivant.cimetiere];
        return suivant;
      }
      const pos = positionAuto(carte, suivant.terrain);
      suivant.terrain = [{ ...carte, ...pos, manuelle: false }, ...suivant.terrain];
      return suivant;
    });
  }, []);

  const piocher = useCallback((n = 1) => {
    setZones((z) => {
      const tirees = z.bibliotheque.slice(0, n);
      if (tirees.length === 0) return z;
      return { ...z, bibliotheque: z.bibliotheque.slice(n), main: [...z.main, ...tirees] };
    });
    noter(n === 1 ? "pioche" : `pioche ${n} cartes`);
  }, [noter]);

  const meuler = useCallback((n: number) => {
    setZones((z) => ({
      ...z,
      bibliotheque: z.bibliotheque.slice(n),
      cimetiere: [...z.bibliotheque.slice(0, n).reverse(), ...z.cimetiere],
    }));
    noter(`meule ${n} cartes`);
  }, [noter]);

  const nouvelleMain = useCallback((garde: number) => {
    setZones((z) => {
      const tout = melanger([
        ...z.bibliotheque, ...z.main,
        ...z.terrain.filter((c) => !c.jeton), ...z.cimetiere, ...z.exil,
      ]);
      return { ...z, bibliotheque: tout.slice(garde), main: tout.slice(0, garde),
               terrain: [], cimetiere: [], exil: [] };
    });
    setTour(1);
  }, []);

  const degagerTout = useCallback(() => {
    setZones((z) => ({ ...z, terrain: z.terrain.map((c) => ({ ...c, engagee: false })) }));
    noter("degage tout");
  }, [noter]);

  const tourSuivant = useCallback(() => {
    setZones((z) => ({ ...z, terrain: z.terrain.map((c) => ({ ...c, engagee: false })) }));
    setTour((t) => t + 1);
    piocher(1);
  }, [piocher]);

  const marqueur = useCallback((uid: string, delta: number) => {
    setZones((z) => ({
      ...z,
      terrain: z.terrain.map((c) =>
        c.uid === uid ? { ...c, marqueurs: Math.max(0, (c.marqueurs ?? 0) + delta) } : c),
    }));
  }, []);

  const creerJeton = useCallback((j?: JetonDispo) => {
    const nom = j?.nom ?? window.prompt("Nom du jeton", "Jeton 1/1");
    if (!nom) return;
    setZones((z) => {
      const carte: CarteJeu = {
        uid: `jeton-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nom, image: j?.image ?? null, typeLigne: j?.typeLigne ?? "Token",
        cmc: 0, engagee: false, jeton: true,
      };
      return { ...z, terrain: [{ ...carte, ...positionAuto(carte, z.terrain) }, ...z.terrain] };
    });
    noter(`cree ${nom}`);
    setMenuPlateau(null);
  }, [noter]);

  // Raccourcis clavier : la souris seule rend le test fastidieux.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      const touches: Record<string, () => void> = {
        d: () => piocher(1), n: tourSuivant, u: degagerTout,
        m: () => { nouvelleMain(7); setMulligans((m) => m + 1); noter("mulligan"); },
        s: () => { setZones((z) => ({ ...z, bibliotheque: melanger(z.bibliotheque) })); noter("melange"); },
        t: () => creerJeton(),
        Escape: () => { setMenu(null); setPanneau(null); },
      };
      const f = touches[e.key];
      if (f) { e.preventDefault(); f(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [piocher, tourSuivant, degagerTout, nouvelleMain, noter, creerJeton]);

  const terrains = useMemo(() => zones.terrain.filter(estTerrain).length, [zones.terrain]);
  const bouton = "rounded-md border border-bordure bg-panneau px-3 py-1.5 text-sm hover:brightness-125";

  /** Depot sur le champ de bataille : la carte se pose la ou on l'a lachee. */
  function deposerSurChamp(e: React.DragEvent) {
    e.preventDefault();
    const uid = e.dataTransfer.getData("text/plain");
    if (!uid || !champ.current) return;
    const r = champ.current.getBoundingClientRect();
    deplacer(uid, "terrain", {
      x: Math.min(94, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(86, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    }, true);
  }

  // La main ne doit jamais deborder ni defiler : on mesure la place reellement
  // disponible, puis les cartes se chevauchent juste ce qu'il faut pour tenir.
  const mainRef = useRef<HTMLDivElement>(null);
  const [largeurMain, setLargeurMain] = useState(0);
  const [largeurCarte, setLargeurCarte] = useState(98);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // La hauteur plafonne la largeur : une carte de main ne prend jamais plus
    // du quart de l'ecran, sinon le champ de bataille disparait.
    const mesurer = () => {
      const l = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--carte-l")) || 126;
      setLargeurCarte(Math.min(l * 0.78, window.innerHeight * 0.185));
      setLargeurMain(el.clientWidth);
    };
    // Mesure immediate : l'observateur ne rend la main qu'au prochain rendu du
    // navigateur, qui n'arrive jamais dans un onglet reste en arriere-plan.
    mesurer();
    const observateur = new ResizeObserver(() => mesurer());
    observateur.observe(el);
    window.addEventListener(EVENEMENT_TAILLE, mesurer);
    window.addEventListener("resize", mesurer);
    return () => {
      observateur.disconnect();
      window.removeEventListener(EVENEMENT_TAILLE, mesurer);
      window.removeEventListener("resize", mesurer);
    };
  }, []);

  // L'eventail ne depasse pas 28 degres au total : au-dela les cartes des
  // extremites debordent lateralement de leur emplacement.
  const angle = (i: number) =>
    (i - (zones.main.length - 1) / 2) * Math.min(2.5, 28 / Math.max(1, zones.main.length - 1));

  const chevauchement = useMemo(() => {
    const n = zones.main.length;
    const mini = Math.round(largeurCarte * 0.33);
    if (n < 2 || largeurMain === 0) return mini;
    // L'inclinaison elargit l'encombrement des cartes de bout : on lui reserve
    // sa part avant de repartir la place restante.
    const utile = largeurMain - 8 - largeurCarte * 0.7;
    const necessaire = (n * largeurCarte - utile) / (n - 1);
    return Math.max(mini, Math.min(largeurCarte * 0.9, necessaire));
  }, [zones.main.length, largeurMain, largeurCarte]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2"
         onClick={() => { setMenu(null); setMenuPlateau(null); }}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-bordure bg-panneau px-3 py-2">
        <span className="text-sm">Tour <strong>{tour}</strong></span>
        <span className="flex items-center gap-1 rounded-md border border-bordure px-2 py-0.5">
          <button onClick={() => setVies((v) => v - 1)} className="px-1.5 text-attenue hover:text-red-400">−</button>
          <strong className="w-9 text-center text-lg" style={{ color: "var(--accent)" }}>{vies}</strong>
          <button onClick={() => setVies((v) => v + 1)} className="px-1.5 text-attenue hover:text-texte">+</button>
        </span>
        <span className="text-xs text-attenue">
          {zones.bibliotheque.length} en bibliotheque · {zones.main.length} en main · {terrains} terrains
        </span>
        <TailleCartes />
        <span className="ml-auto text-[11px] text-attenue">
          Clic droit sur le plateau pour toutes les actions · clic sur une carte en main pour la jouer ·
          glisser pour placer soi-meme · <kbd>D</kbd> pioche · <kbd>N</kbd> tour
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div ref={champ}
               onDragOver={(e) => e.preventDefault()}
               onDrop={deposerSurChamp}
               onContextMenu={(e) => { e.preventDefault();
                                       setMenuPlateau({ x: e.clientX, y: e.clientY }); }}
               className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-bordure p-2"
               style={{ background:
                 "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 7%, var(--panneau)) 0%, var(--fond) 75%)",
                 boxShadow: "inset 0 0 80px rgba(0,0,0,.45)" }}>
            <span className="pointer-events-none absolute left-3 top-2 text-xs text-attenue">
              {LIBELLES.terrain} · {zones.terrain.length}
            </span>
            {zones.terrain.length === 0 && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-attenue">
                Fais glisser des cartes depuis ta main
              </span>
            )}
            {zones.terrain.map((c) => (
              <CarteSurChamp key={c.uid} carte={c}
                             onEngager={() => setZones((z) => ({
                               ...z, terrain: z.terrain.map((x) =>
                                 x.uid === c.uid ? { ...x, engagee: !x.engagee } : x) }))}
                             onMenu={(x, y) => setMenu({ uid: c.uid, zone: "terrain", x, y })}
                             />
            ))}
          </div>

        <div className="flex shrink-0 items-end gap-3">
            <Pile titre="Bibliotheque" nombre={zones.bibliotheque.length} dos
                  onClic={() => piocher(1)}
                  onMenu={() => setPanneau({ titre: "Bibliotheque", cartes: zones.bibliotheque })}
                  onDepot={(uid) => deplacer(uid, "bibliotheque")}
                  aide="Cliquer pour piocher · clic droit pour parcourir" />

            <div ref={mainRef}
                 className="min-w-0 flex-1 overflow-hidden rounded-xl border border-bordure p-2"
                 style={{ background:
                   "linear-gradient(to top, color-mix(in srgb, var(--accent) 5%, var(--panneau)), var(--panneau))" }}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => { e.preventDefault();
                                  deplacer(e.dataTransfer.getData("text/plain"), "main"); }}>
              <p className="mb-1 text-xs text-attenue">{LIBELLES.main} · {zones.main.length}</p>
              {zones.main.length === 0 ? (
                <p className="py-6 text-center text-sm text-attenue">Main vide</p>
              ) : (
                <ul className="flex flex-nowrap justify-center pt-5">
                  {zones.main.map((c, i) => (
                    <li key={c.uid} draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", c.uid)}
                        onClick={() => jouer(c.uid)}
                        title="Cliquer pour jouer, ou faire glisser pour placer soi-meme"
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation();
                                                setMenu({ uid: c.uid, zone: "main", x: e.clientX, y: e.clientY }); }}
                        className="shrink-0 cursor-grab transition-transform duration-150
                                   hover:z-20 hover:-translate-y-5 hover:rotate-0"
                        style={{ zIndex: i, marginLeft: i === 0 ? 0 : -chevauchement,
                                 transform: `rotate(${angle(i)}deg)` }}>
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt={c.nom}
                             className="max-w-none rounded-[4.75%] border border-bordure shadow-xl"
                             style={{ width: largeurCarte }} />
                      ) : <span className="block rounded border border-bordure p-2 text-xs">{c.nom}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              {(["cimetiere", "exil"] as Zone[]).map((z) => (
                <Pile key={z} titre={LIBELLES[z]} nombre={zones[z].length}
                      apercu={zones[z][0]?.image ?? null}
                      onClic={() => zones[z].length > 0 && setPanneau({ titre: LIBELLES[z], cartes: zones[z] })}
                      onDepot={(uid) => deplacer(uid, z)}
                      aide="Faire glisser une carte ici pour l'y envoyer" />
              ))}
              {/* La zone de commandement est mise en avant : le commandant y
                  retourne sans cesse et doit pouvoir etre relance d'un clic. */}
              <Pile titre="Commandement" nombre={zones.commandement.length}
                    apercu={zones.commandement[0]?.image ?? null}
                    accent
                    onClic={() => { const c = zones.commandement[0];
                                    if (c) jouer(c.uid); }}
                    onMenu={() => zones.commandement.length > 0 &&
                            setPanneau({ titre: "Commandement", cartes: zones.commandement })}
                    onDepot={(uid) => deplacer(uid, "commandement")}
                    aide="Cliquer pour lancer le commandant · y faire glisser une carte pour l'y renvoyer" />
            </div>
          </div>
        </div>

      {menuPlateau && (
        <MenuPlateau x={menuPlateau.x} y={menuPlateau.y} jetons={jetons}
                     onTourSuivant={() => { tourSuivant(); setMenuPlateau(null); }}
                     onDegager={() => { degagerTout(); setMenuPlateau(null); }}
                     onMelanger={() => { setZones((z) => ({ ...z, bibliotheque: melanger(z.bibliotheque) }));
                                         noter("melange"); setMenuPlateau(null); }}
                     onJeton={creerJeton}
                     onFermer={() => setMenuPlateau(null)} />
      )}

      {menu && (
        <MenuCarte menu={menu} onDeplacer={deplacer} onMarqueur={marqueur}
                   onFermer={() => setMenu(null)} />
      )}

      {panneau && (
        <PanneauZone titre={panneau.titre} cartes={panneau.cartes}
                     onPrendre={(uid) => { deplacer(uid, "main"); setPanneau(null); }}
                     onFermer={() => setPanneau(null)} />
      )}
    </div>
  );
}

/** Groupe de commandes, avec son intitule au-dessus. */
function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-0.5 text-[10px] uppercase tracking-wide text-attenue">{titre}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

function CarteSurChamp({
  carte, onEngager, onMenu,
}: {
  carte: CarteJeu; onEngager: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  return (
    <div draggable
         onDragStart={(e) => e.dataTransfer.setData("text/plain", carte.uid)}
         onClick={(e) => { e.stopPropagation(); onEngager(); }}
         onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onMenu(e.clientX, e.clientY); }}
         className="absolute cursor-grab transition-transform"
         style={{ left: `${carte.x ?? 50}%`, top: `${carte.y ?? 50}%`,
                  transform: carte.engagee ? "rotate(90deg)" : undefined, zIndex: 1 }}>
      {carte.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={carte.image} alt={carte.nom}
             className={`rounded-[4.75%] border shadow-2xl transition-shadow ${
               carte.engagee ? "border-accent brightness-90" : "border-bordure"}`}
             style={{ width: "calc(var(--carte-l) * 0.62)" }} />
      ) : (
        <span className="block rounded border border-accent bg-fond p-2 text-center text-[11px]"
              style={{ width: "calc(var(--carte-l) * 0.62)" }}>
          {carte.nom}
        </span>
      )}
      {(carte.marqueurs ?? 0) > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 text-xs font-bold text-accent-texte">
          +{carte.marqueurs}
        </span>
      )}
    </div>
  );
}

function MenuCarte({
  menu, onDeplacer, onMarqueur, onFermer,
}: {
  menu: { uid: string; zone: Zone; x: number; y: number };
  onDeplacer: (uid: string, vers: Zone) => void;
  onMarqueur: (uid: string, delta: number) => void;
  onFermer: () => void;
}) {
  const destinations: [Zone, string][] = [
    ["terrain", "Jouer"], ["main", "En main"], ["cimetiere", "Cimetiere"],
    ["exil", "Exiler"], ["bibliotheque", "Sous la bibliotheque"],
  ];
  return (
    <div className="fixed z-50 min-w-44 rounded-md border border-bordure bg-panneau py-1 shadow-2xl"
         style={{ left: menu.x, top: menu.y }}
         onClick={(e) => e.stopPropagation()}>
      {menu.zone === "terrain" && (
        <div className="flex items-center gap-2 border-b border-bordure px-3 py-1.5 text-xs">
          <span className="flex-1 text-attenue">Marqueurs</span>
          <button onClick={() => onMarqueur(menu.uid, -1)} className="px-1.5">−</button>
          <button onClick={() => onMarqueur(menu.uid, 1)} className="px-1.5">+</button>
        </div>
      )}
      {destinations.filter(([z]) => z !== menu.zone).map(([z, libelle]) => (
        <button key={z} onClick={() => { onDeplacer(menu.uid, z); onFermer(); }}
                className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
          {libelle}
        </button>
      ))}
    </div>
  );
}

function PanneauZone({
  titre, cartes, onPrendre, onFermer,
}: {
  titre: string; cartes: CarteJeu[];
  onPrendre: (uid: string) => void; onFermer: () => void;
}) {
  const [filtre, setFiltre] = useState("");
  const vues = cartes.filter((c) => c.nom.toLowerCase().includes(filtre.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6"
         onClick={onFermer}>
      <div className="w-full max-w-5xl rounded-xl border border-bordure bg-panneau p-4"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <span className="text-sm text-attenue">{cartes.length} cartes</span>
          <input value={filtre} onChange={(e) => setFiltre(e.target.value)}
                 placeholder="Filtrer" className="ml-auto w-48 text-sm" />
          <button onClick={onFermer} className="rounded-md border border-bordure px-3 py-1 text-sm">
            Fermer
          </button>
        </div>
        <ul className="grid max-h-[70vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
          {vues.map((c) => (
            <li key={c.uid}>
              <button onClick={() => onPrendre(c.uid)} className="block w-full" title="Mettre en main">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={c.nom} loading="lazy"
                       className="w-full rounded-[4.75%] border border-bordure hover:border-accent" />
                ) : <span className="block rounded border border-bordure p-2 text-xs">{c.nom}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


/** Actions generales, au clic droit sur le plateau. */
function MenuPlateau({
  x, y, jetons, onTourSuivant, onDegager, onMelanger, onJeton, onFermer,
}: {
  x: number; y: number; jetons: JetonDispo[];
  onTourSuivant: () => void; onDegager: () => void; onMelanger: () => void;
  onJeton: (j?: JetonDispo) => void; onFermer: () => void;
}) {
  return (
    <div className="fixed z-50 min-w-52 rounded-md border border-bordure bg-panneau py-1 shadow-2xl"
         style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <button onClick={onTourSuivant} className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
        Passer le tour
      </button>
      <button onClick={onDegager} className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
        Degager tous les permanents
      </button>
      <button onClick={onMelanger} className="block w-full px-3 py-1.5 text-left text-xs hover:text-accent">
        Melanger la bibliotheque
      </button>

      <div className="mt-1 border-t border-bordure pt-1">
        <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-attenue">
          Jetons {jetons.length > 0 && `du deck (${jetons.length})`}
        </p>
        {/* Les jetons proposes sont ceux que les cartes du deck peuvent creer,
            d'apres les pieces liees renseignees par Scryfall. */}
        <div className="max-h-48 overflow-y-auto">
          {jetons.map((j) => (
            <button key={j.nom} onClick={() => onJeton(j)}
                    className="block w-full truncate px-3 py-1 text-left text-xs hover:text-accent"
                    title={j.typeLigne}>
              {j.nom}
            </button>
          ))}
          {jetons.length === 0 && (
            <p className="px-3 py-1 text-xs text-attenue">Aucun detecte dans ce deck.</p>
          )}
        </div>
        <button onClick={() => onJeton()} onMouseDown={onFermer}
                className="block w-full px-3 py-1.5 text-left text-xs text-attenue hover:text-accent">
          Jeton personnalise...
        </button>
      </div>
    </div>
  );
}


/**
 * Pile de cartes posee sur la table.
 *
 * La bibliotheque montre un dos de carte, les autres zones la carte du dessus.
 * Chaque pile accepte qu'on y fasse glisser une carte depuis le plateau.
 */
function Pile({
  titre, nombre, dos = false, apercu = null, accent = false, onClic, onMenu, onDepot, aide,
}: {
  titre: string; nombre: number; dos?: boolean; apercu?: string | null; accent?: boolean;
  onClic: () => void; onMenu?: () => void;
  onDepot: (uid: string) => void; aide: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1"
         onDragOver={(e) => e.preventDefault()}
         onDrop={(e) => { e.preventDefault(); onDepot(e.dataTransfer.getData("text/plain")); }}>
      <button onClick={onClic} title={aide}
              onContextMenu={(e) => { if (onMenu) { e.preventDefault(); e.stopPropagation(); onMenu(); } }}
              className={`relative block rounded-[4.75%] border transition hover:brightness-110 ${
                accent ? "border-accent" : "border-bordure"}`}
              style={{ width: "calc(var(--carte-l) * 0.62)", aspectRatio: "5 / 7",
                       boxShadow: nombre > 0 ? "3px 3px 0 var(--bordure), 6px 6px 0 var(--panneau)" : undefined,
                       background: "var(--fond)" }}>
        {nombre > 0 && (dos || apercu) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dos ? DOS_DE_CARTE : (apercu as string)} alt=""
               className="h-full w-full rounded-[4.75%] object-cover" />
        )}
        <span className="absolute inset-x-0 bottom-0 rounded-b-[4.75%] bg-black/75 py-0.5
                         text-center text-xs font-semibold text-white">
          {nombre}
        </span>
      </button>
      <span className={`text-[10px] uppercase tracking-wide ${accent ? "text-accent" : "text-attenue"}`}>
        {titre}
      </span>
    </div>
  );
}
