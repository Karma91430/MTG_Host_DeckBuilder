import { chargerDeck, listerDecks } from "@/lib/chargement";
import { statistiques } from "@/lib/deck";
import { comparer } from "@/lib/comparaison";
import { estimerPuissance } from "@/lib/puissance";
import Comparaison from "@/components/Comparaison";

export const dynamic = "force-dynamic";

export default async function PageComparer({
  searchParams,
}: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a: idA, b: idB } = await searchParams;
  const decks = listerDecks();

  const chargeA = idA ? await chargerDeck(idA) : null;
  const chargeB = idB ? await chargerDeck(idB) : null;

  const entete = (c: Awaited<ReturnType<typeof chargerDeck>>) => {
    if (!c) return null;
    const p = estimerPuissance(c.entrees, c.deck.format);
    return {
      id: c.deck.id, nom: c.deck.name, format: c.deck.format,
      note: p?.note ?? null, palier: p?.palier ?? null,
    };
  };

  const ecarts = chargeA && chargeB
    ? comparer(
        { entrees: chargeA.entrees, stats: statistiques(chargeA.entrees) },
        { entrees: chargeB.entrees, stats: statistiques(chargeB.entrees) },
      )
    : null;

  return (
    <Comparaison decks={decks} a={entete(chargeA)} b={entete(chargeB)} ecarts={ecarts} />
  );
}
