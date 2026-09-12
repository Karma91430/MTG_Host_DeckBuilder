import { db } from "./db";

/**
 * Acces a l'API Scryfall.
 *
 * Leur documentation demande un delai entre les appels et un User-Agent
 * identifiable. On respecte les deux, et on garde en cache local ce qui a
 * deja ete demande : les donnees d'une carte ne bougent quasiment jamais.
 */

const BASE = "https://api.scryfall.com";
const UA = "MTGDeckbuilder/1.0 (self-hosted)";
const DELAI_MS = 120;

const globalForRate = globalThis as unknown as { __scryfallLast?: number };

async function patienter() {
  const last = globalForRate.__scryfallLast ?? 0;
  const attente = DELAI_MS - (Date.now() - last);
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  globalForRate.__scryfallLast = Date.now();
}

async function appel<T>(chemin: string): Promise<T> {
  await patienter();
  const res = await fetch(`${BASE}${chemin}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { details?: string }).details ?? `Scryfall ${res.status}`);
  }
  return (await res.json()) as T;
}

export type Carte = {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: { small: string; normal: string; large: string; art_crop: string };
  card_faces?: { name: string; mana_cost?: string; oracle_text?: string; type_line?: string;
                 image_uris?: { small: string; normal: string; large: string; art_crop: string } }[];
  legalities: Record<string, string>;
  prices?: Record<string, string | null>;
  scryfall_uri: string;
};

/** Illustration d'une carte, y compris pour les cartes recto-verso. */
export function imageDe(c: Carte, taille: "small" | "normal" | "large" = "normal"): string | null {
  return c.image_uris?.[taille] ?? c.card_faces?.[0]?.image_uris?.[taille] ?? null;
}

export async function chercher(requete: string, page = 1) {
  const q = encodeURIComponent(requete);
  return appel<{ data: Carte[]; total_cards: number; has_more: boolean }>(
    `/cards/search?q=${q}&page=${page}&unique=cards&order=name`,
  );
}

/** Recupere une carte, depuis le cache local si elle y est deja. */
export async function carte(id: string): Promise<Carte> {
  const ligne = db().prepare("SELECT payload FROM card_cache WHERE id = ?").get(id) as
    | { payload: string } | undefined;
  if (ligne) return JSON.parse(ligne.payload) as Carte;

  const c = await appel<Carte>(`/cards/${id}`);
  memoriser(c);
  return c;
}

export function memoriser(c: Carte) {
  db().prepare(
    "INSERT OR REPLACE INTO card_cache (id, payload, fetched_at) VALUES (?, ?, ?)",
  ).run(c.id, JSON.stringify(c), new Date().toISOString());
}

/** Plusieurs cartes d'un coup, en ne demandant au reseau que les inconnues. */
export async function cartes(ids: string[]): Promise<Map<string, Carte>> {
  const trouvees = new Map<string, Carte>();
  const manquantes: string[] = [];

  for (const id of ids) {
    const ligne = db().prepare("SELECT payload FROM card_cache WHERE id = ?").get(id) as
      | { payload: string } | undefined;
    if (ligne) trouvees.set(id, JSON.parse(ligne.payload) as Carte);
    else manquantes.push(id);
  }

  // L'API accepte 75 identifiants par requete groupee.
  for (let i = 0; i < manquantes.length; i += 75) {
    const lot = manquantes.slice(i, i + 75);
    await patienter();
    const res = await fetch(`${BASE}/cards/collection`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: lot.map((id) => ({ id })) }),
    });
    if (!res.ok) continue;
    const { data } = (await res.json()) as { data: Carte[] };
    for (const c of data) { memoriser(c); trouvees.set(c.id, c); }
  }
  return trouvees;
}

export async function extensions() {
  const { data } = await appel<{ data: { code: string; name: string; icon_svg_uri: string;
                                         released_at: string; set_type: string; card_count: number }[] }>("/sets");
  return data
    .filter((s) => ["expansion", "core"].includes(s.set_type) && s.card_count > 50)
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
}
