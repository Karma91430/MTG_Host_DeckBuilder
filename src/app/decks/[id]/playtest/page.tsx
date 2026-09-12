import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type DeckRow, type DeckCardRow } from "@/lib/db";
import { cartes, imageDe } from "@/lib/scryfall";
import ThemeShell from "@/components/ThemeShell";
import Playtest, { type CarteJeu } from "@/components/Playtest";

export const dynamic = "force-dynamic";

export default async function PagePlaytest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = db().prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
  if (!deck) notFound();

  const lignes = db().prepare(
    "SELECT * FROM deck_cards WHERE deck_id = ? AND zone IN ('main','command')",
  ).all(id) as DeckCardRow[];
  const donnees = await cartes(lignes.map((l) => l.card_id));

  // Le deck est developpe en exemplaires distincts : deux copies d'une meme
  // carte doivent pouvoir etre tapees ou defaussees independamment.
  const bibliotheque: CarteJeu[] = [];
  const commandants: CarteJeu[] = [];
  for (const l of lignes) {
    const c = donnees.get(l.card_id);
    if (!c) continue;
    for (let i = 0; i < l.quantity; i++) {
      const exemplaire: CarteJeu = {
        uid: `${l.id}-${i}`,
        nom: c.name,
        image: imageDe(c, "normal"),
        typeLigne: c.type_line,
        cmc: c.cmc,
        engagee: false,
      };
      (l.zone === "command" ? commandants : bibliotheque).push(exemplaire);
    }
  }

  // Jetons que le deck est susceptible de creer : Scryfall rattache a chaque
  // carte les pieces liees, dont les jetons qu'elle produit.
  const idsJetons = new Set<string>();
  for (const c of donnees.values()) {
    for (const part of c.all_parts ?? []) {
      if (part.component === "token") idsJetons.add(part.id);
    }
  }
  const cartesJetons = idsJetons.size > 0 ? await cartes([...idsJetons]) : new Map();
  const jetons = [...cartesJetons.values()]
    .map((c) => ({ nom: c.name, typeLigne: c.type_line, image: imageDe(c, "normal") }))
    .sort((a, b) => a.nom.localeCompare(b.nom));

  return (
    <ThemeShell id={deck.theme} className="-mx-6 -my-8 min-h-screen bg-fond px-6 py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">{deck.name}</h1>
        <span className="text-sm text-attenue">{bibliotheque.length} cartes</span>
        <Link href={`/decks/${deck.id}`}
              className="ml-auto rounded-md border border-bordure px-3 py-1.5 text-sm">
          Retour a l&apos;edition
        </Link>
      </div>
      <Playtest bibliotheque={bibliotheque} commandants={commandants} jetons={jetons} />
    </ThemeShell>
  );
}
