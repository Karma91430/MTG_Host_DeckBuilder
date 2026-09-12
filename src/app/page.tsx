import Link from "next/link";
import { db } from "@/lib/db";
import { cartes } from "@/lib/scryfall";
import { theme, symboleExtension } from "@/lib/themes";
import NouveauDeck from "@/components/NouveauDeck";

export const dynamic = "force-dynamic";

type Ligne = {
  id: string; name: string; format: string; theme: string;
  folder: string; tags: string; updated_at: string;
  cartes: number; commandant: string | null;
};

export default async function Accueil() {
  const decks = db().prepare(`
    SELECT d.id, d.name, d.format, d.theme, d.folder, d.tags, d.updated_at,
           (SELECT COALESCE(SUM(quantity),0) FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone IN ('main','command')) AS cartes,
           (SELECT c.card_id FROM deck_cards c
             WHERE c.deck_id = d.id AND c.zone = 'command' LIMIT 1) AS commandant
    FROM decks d ORDER BY d.folder, d.updated_at DESC
  `).all() as Ligne[];

  // L'illustration du commandant sert de visuel au deck : une seule requete
  // groupee, servie par le cache des que les cartes y sont.
  const visuels = await cartes(decks.map((d) => d.commandant).filter(Boolean) as string[]);

  const dossiers = new Map<string, Ligne[]>();
  for (const d of decks) {
    const cle = d.folder || "";
    if (!dossiers.has(cle)) dossiers.set(cle, []);
    dossiers.get(cle)!.push(d);
  }
  const groupes = [...dossiers.entries()].sort((a, b) => {
    if (!a[0]) return 1;
    if (!b[0]) return -1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mes decks</h1>
          <p className="text-sm text-attenue">
            {decks.length} deck{decks.length > 1 ? "s" : ""}
          </p>
        </div>
        <NouveauDeck />
      </div>

      {decks.length === 0 ? (
        <div className="rounded-xl border border-bordure bg-panneau p-12 text-center">
          <p className="text-attenue">Aucun deck pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-attenue">
            Cree ton premier deck et choisis son identite visuelle.
          </p>
        </div>
      ) : (
        groupes.map(([dossier, liste]) => (
          <section key={dossier || "_"} className="space-y-3">
            {groupes.length > 1 && (
              <h2 className="text-sm uppercase tracking-wide text-attenue">
                {dossier || "Sans dossier"}
              </h2>
            )}
            <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {liste.map((d) => {
                const t = theme(d.theme);
                const carte = d.commandant ? visuels.get(d.commandant) : undefined;
                const art = carte?.image_uris?.art_crop
                  ?? carte?.card_faces?.[0]?.image_uris?.art_crop;
                return (
                  <li key={d.id}>
                    <Link href={`/decks/${d.id}`}
                          className="group block overflow-hidden rounded-xl border shadow-lg transition
                                     hover:-translate-y-0.5 hover:shadow-xl"
                          style={{ borderColor: t.couleurs.bordure, background: t.couleurs.panneau }}>
                      <div className="relative h-24 overflow-hidden" style={{ background: t.couleurs.fond }}>
                        {art ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={art} alt="" loading="lazy"
                               className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        ) : null}
                        {/* Degrade pour que le titre reste lisible sur toute illustration. */}
                        <div className="absolute inset-0"
                             style={{ background: `linear-gradient(to top, ${t.couleurs.panneau} 8%, transparent 70%)` }} />
                        <div className="absolute left-3 top-2 flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={symboleExtension(t.set)} alt="" width={14} height={14}
                               className="symbole-extension" />
                          <span className="text-[10px] uppercase tracking-wide drop-shadow"
                                style={{ color: t.couleurs.accent }}>{t.nom}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5 p-3 pt-2">
                        <p className="truncate text-sm font-semibold" style={{ color: t.couleurs.texte }}>
                          {d.name}
                        </p>
                        <p className="truncate text-xs capitalize" style={{ color: t.couleurs.attenue }}>
                          {d.format} · {d.cartes} cartes
                          {carte && ` · ${carte.name}`}
                        </p>
                        {d.tags && (
                          <p className="flex flex-wrap gap-1 pt-1">
                            {d.tags.split(",").map((x) => x.trim()).filter(Boolean).map((x) => (
                              <span key={x} className="rounded-full px-2 py-0.5 text-[11px]"
                                    style={{ border: `1px solid ${t.couleurs.bordure}`,
                                             color: t.couleurs.attenue }}>
                                {x}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
