import { db } from "./db";
import type { Carte, Impression } from "./carte";
import { imageDe as imageDeCarte } from "./carte";

export type { Carte, Impression } from "./carte";
export { imageDe } from "./carte";

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

/**
 * Recherche de cartes.
 *
 * L'ordre par defaut reste alphabetique, celui qu'on attend d'une recherche
 * manuelle. Les suggestions demandent au contraire l'ordre de popularite, que
 * Scryfall expose sous le nom « edhrec ».
 */
export async function chercher(
  requete: string,
  page = 1,
  ordre: "name" | "edhrec" | "released" | "cmc" = "name",
) {
  const q = encodeURIComponent(requete);
  return appel<{ data: Carte[]; total_cards: number; has_more: boolean }>(
    `/cards/search?q=${q}&page=${page}&unique=cards&order=${ordre}`,
  );
}

/**
 * Recherche tolerante : une requete sans resultat n'est pas une erreur.
 *
 * Les suggestions lancent une requete par manque detecte. Certaines ne
 * ramenent rien -- il n existe pas toujours de carte a deux manas repondant a
 * la mecanique du deck -- et cela ne doit pas faire echouer tout le panneau.
 */
export async function chercherOuRien(
  requete: string,
  ordre: "name" | "edhrec" | "released" | "cmc" = "edhrec",
): Promise<Carte[]> {
  try {
    const { data } = await chercher(requete, 1, ordre);
    for (const c of data) memoriser(c);
    return data;
  } catch {
    return [];
  }
}

/**
 * Toutes les impressions d'une carte, de la plus recente a la plus ancienne.
 *
 * Scryfall donne sur chaque carte l'adresse de cette recherche ; on la refait
 * nous-memes a partir du nom exact pour ne pas dependre d'un champ absent des
 * entrees mises en cache avant cette fonctionnalite.
 */
export async function impressions(c: Carte): Promise<Impression[]> {
  const requete = `!"${c.name.replace(/"/g, "")}" game:paper`;
  const q = encodeURIComponent(requete);
  const tirages: Carte[] = [];
  try {
    // Deux pages suffisent : au-dela de 350 tirages, la liste n'aide plus.
    for (let page = 1; page <= 2; page++) {
      const r = await appel<{ data: Carte[]; has_more: boolean }>(
        `/cards/search?q=${q}&page=${page}&unique=prints&order=released`,
      );
      tirages.push(...r.data);
      if (!r.has_more) break;
    }
  } catch {
    return [];
  }

  for (const t of tirages) memoriser(t);
  return tirages.map((t) => ({
    id: t.id,
    set: t.set,
    set_name: t.set_name,
    collector_number: t.collector_number ?? "",
    released_at: t.released_at ?? "",
    image: imageDeCarte(t, "normal"),
    prix: t.prices?.eur ?? t.prices?.usd ?? null,
    promo: Boolean(t.promo),
    effets: t.frame_effects ?? [],
  }));
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

/**
 * Resout des cartes par leur nom, pour l'import d'une liste collee.
 *
 * L'API accepte des identifiants par nom exact et renvoie separement ce
 * qu'elle n'a pas trouve : on peut donc signaler les lignes fautives au lieu
 * d'abandonner tout l'import.
 */
export async function parNoms(noms: string[]): Promise<{
  trouvees: Map<string, Carte>;
  introuvables: string[];
}> {
  const trouvees = new Map<string, Carte>();
  const introuvables: string[] = [];

  for (let i = 0; i < noms.length; i += 75) {
    const lot = noms.slice(i, i + 75);
    await patienter();
    const res = await fetch(`${BASE}/cards/collection`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: lot.map((name) => ({ name })) }),
    });
    if (!res.ok) { introuvables.push(...lot); continue; }
    const data = (await res.json()) as
      { data: Carte[]; not_found?: { name?: string }[] };
    for (const c of data.data) {
      memoriser(c);
      trouvees.set(c.name.toLowerCase(), c);
    }
    for (const nf of data.not_found ?? []) if (nf.name) introuvables.push(nf.name);
  }
  return { trouvees, introuvables };
}

export async function extensions() {
  const { data } = await appel<{ data: { code: string; name: string; icon_svg_uri: string;
                                         released_at: string; set_type: string; card_count: number }[] }>("/sets");
  return data
    .filter((s) => ["expansion", "core"].includes(s.set_type) && s.card_count > 50)
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
}
