import { db, newId, type DeckCardRow } from "./db";

/**
 * Historique des modifications d'un deck, par instantanes.
 *
 * Un deck depasse rarement quelques centaines de lignes : sauvegarder son
 * contenu entier avant chaque modification coute peu et evite d'avoir a
 * decrire, puis inverser, chaque type d'operation.
 */

const PROFONDEUR = 40;

type Instantane = Pick<DeckCardRow, "card_id" | "quantity" | "zone" | "category" | "owned">[];

function contenu(deckId: string): Instantane {
  return db().prepare(
    "SELECT card_id, quantity, zone, category, owned FROM deck_cards WHERE deck_id = ?",
  ).all(deckId) as Instantane;
}

/** A appeler avant toute modification, pour pouvoir y revenir. */
export function memoriser(deckId: string) {
  const pos = (db().prepare("SELECT history_pos FROM decks WHERE id = ?")
    .get(deckId) as { history_pos: number } | undefined)?.history_pos ?? -1;

  const ecrire = db().transaction(() => {
    // Une nouvelle action apres des annulations efface la branche abandonnee,
    // comme dans n'importe quel editeur.
    db().prepare("DELETE FROM deck_history WHERE deck_id = ? AND position > ?").run(deckId, pos);

    const suivante = pos + 1;
    db().prepare(`
      INSERT INTO deck_history (id, deck_id, position, contenu, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(newId(), deckId, suivante, JSON.stringify(contenu(deckId)), new Date().toISOString());

    db().prepare("UPDATE decks SET history_pos = ? WHERE id = ?").run(suivante, deckId);
    db().prepare(
      "DELETE FROM deck_history WHERE deck_id = ? AND position <= ?",
    ).run(deckId, suivante - PROFONDEUR);
  });
  ecrire();
}

function restaurer(deckId: string, etat: Instantane) {
  const inserer = db().prepare(`
    INSERT INTO deck_cards (id, deck_id, card_id, quantity, zone, category, owned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  db().prepare("DELETE FROM deck_cards WHERE deck_id = ?").run(deckId);
  for (const l of etat) {
    inserer.run(newId(), deckId, l.card_id, l.quantity, l.zone, l.category, l.owned ?? "none");
  }
  db().prepare("UPDATE decks SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), deckId);
}

function lire(deckId: string, position: number): Instantane | null {
  const ligne = db().prepare(
    "SELECT contenu FROM deck_history WHERE deck_id = ? AND position = ?",
  ).get(deckId, position) as { contenu: string } | undefined;
  return ligne ? (JSON.parse(ligne.contenu) as Instantane) : null;
}

export function annuler(deckId: string): boolean {
  const pos = (db().prepare("SELECT history_pos FROM decks WHERE id = ?")
    .get(deckId) as { history_pos: number }).history_pos;
  const etat = lire(deckId, pos);
  if (!etat) return false;

  const appliquer = db().transaction(() => {
    // On archive l'etat courant avant de l'ecraser : sans cela, rien ne
    // permettrait de revenir en avant. Il se range juste apres l'instantane
    // qu'on s'apprete a restaurer.
    db().prepare("DELETE FROM deck_history WHERE deck_id = ? AND position = ?")
        .run(deckId, pos + 1);
    db().prepare(`
      INSERT INTO deck_history (id, deck_id, position, contenu, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(newId(), deckId, pos + 1, JSON.stringify(contenu(deckId)), new Date().toISOString());

    // L'instantane courant decrit l'etat d'AVANT la derniere action : le
    // restaurer revient a defaire celle-ci.
    restaurer(deckId, etat);
    db().prepare("UPDATE decks SET history_pos = ? WHERE id = ?").run(pos - 1, deckId);
  });
  appliquer();
  return true;
}

export function retablir(deckId: string): boolean {
  const pos = (db().prepare("SELECT history_pos FROM decks WHERE id = ?")
    .get(deckId) as { history_pos: number }).history_pos;
  const etat = lire(deckId, pos + 2);
  if (!etat) return false;

  const appliquer = db().transaction(() => {
    restaurer(deckId, etat);
    db().prepare("UPDATE decks SET history_pos = ? WHERE id = ?").run(pos + 1, deckId);
  });
  appliquer();
  return true;
}

export function etatHistorique(deckId: string) {
  const pos = (db().prepare("SELECT history_pos FROM decks WHERE id = ?")
    .get(deckId) as { history_pos: number } | undefined)?.history_pos ?? -1;
  const max = (db().prepare(
    "SELECT COALESCE(MAX(position), -1) AS m FROM deck_history WHERE deck_id = ?",
  ).get(deckId) as { m: number }).m;
  return { peutAnnuler: pos >= 0, peutRetablir: pos + 2 <= max };
}
