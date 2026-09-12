import { NextResponse } from "next/server";
import { db, type DeckRow, type DeckCardRow } from "@/lib/db";
import { cartes, chercherOuRien } from "@/lib/scryfall";
import type { EntreeResolue } from "@/lib/deck";
import {
  manquesDuDeck, identiteDuDeck, requeteComplete,
  SEUILS_DEFAUT, type Seuils, type GroupeSuggestions,
} from "@/lib/suggestions";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Suggestions retenues par manque : au-dela, le panneau devient illisible. */
const PAR_MANQUE = 8;

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Les seuils voyagent en parametres : ce sont des choix de l'utilisateur,
  // pas une constante du serveur.
  const url = new URL(req.url);
  const seuils: Seuils = { ...SEUILS_DEFAUT };
  for (const cle of Object.keys(SEUILS_DEFAUT) as (keyof Seuils)[]) {
    const v = Number(url.searchParams.get(cle));
    if (Number.isFinite(v) && v > 0) seuils[cle] = v;
  }

  const lignes = db().prepare("SELECT * FROM deck_cards WHERE deck_id = ?")
    .all(id) as DeckCardRow[];
  const donnees = await cartes(lignes.map((l) => l.card_id));
  const entrees: EntreeResolue[] = lignes
    .map((l) => ({ ...l, carte: donnees.get(l.card_id)! }))
    .filter((e) => e.carte);

  const manques = manquesDuDeck(entrees, deck.format, seuils);
  if (manques.length === 0) {
    return NextResponse.json({ groupes: [], vide: "deck trop court pour etre lu" });
  }

  const identite = identiteDuDeck(entrees);
  // Tout ce qui est deja quelque part dans le deck est ecarte, y compris la
  // reserve et la liste « a voir » : le proposer serait du bruit.
  const deja = new Set(entrees.map((e) => e.carte.name.toLowerCase()));

  const groupes: GroupeSuggestions[] = [];
  for (const manque of manques) {
    const trouvees = await chercherOuRien(requeteComplete(manque, identite, deck.format), "edhrec");
    const retenues = trouvees
      .filter((c) => !deja.has(c.name.toLowerCase()))
      .slice(0, PAR_MANQUE)
      .map((carte) => ({ carte, rang: carte.edhrec_rank ?? null }));
    if (retenues.length > 0) groupes.push({ manque, cartes: retenues });
  }

  return NextResponse.json({ groupes, identite });
}
