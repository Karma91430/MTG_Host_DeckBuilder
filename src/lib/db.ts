import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.MTGDECK_DATA_DIR ?? path.join(process.cwd(), "data");

const globalForDb = globalThis as unknown as { __mtgDb?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "decks.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      format      TEXT NOT NULL DEFAULT 'commander',
      description TEXT NOT NULL DEFAULT '',
      theme       TEXT NOT NULL DEFAULT 'obsidian',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deck_cards (
      id        TEXT PRIMARY KEY,
      deck_id   TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      card_id   TEXT NOT NULL,
      quantity  INTEGER NOT NULL DEFAULT 1,
      zone      TEXT NOT NULL DEFAULT 'main',   -- main | side | command | maybe
      category  TEXT NOT NULL DEFAULT '',
      UNIQUE (deck_id, card_id, zone)
    );
    CREATE INDEX IF NOT EXISTS deck_cards_deck ON deck_cards(deck_id, zone);

    -- Cache des reponses Scryfall : leur API demande de limiter la cadence,
    -- et une carte consultee ne change pratiquement jamais.
    -- Instantanes du contenu d'un deck, pour annuler et retablir.
    CREATE TABLE IF NOT EXISTS deck_history (
      id         TEXT PRIMARY KEY,
      deck_id    TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      position   INTEGER NOT NULL,
      contenu    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deck_history_deck ON deck_history(deck_id, position);

    -- Groupes de cartes reutilisables d'un deck a l'autre.
    CREATE TABLE IF NOT EXISTS packages (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      contenu    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_cache (
      id         TEXT PRIMARY KEY,
      payload    TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );
  `);

  // Statut d'acquisition : possedee, en cours d'achat, ou manquante.
  ajouterColonne(db, "deck_cards", "owned", "TEXT NOT NULL DEFAULT 'none'");
  // Rangement des decks, une fois qu'ils se comptent par dizaines.
  ajouterColonne(db, "decks", "folder", "TEXT NOT NULL DEFAULT ''");
  ajouterColonne(db, "decks", "tags", "TEXT NOT NULL DEFAULT ''");
  // Curseur dans l'historique : -1 quand aucun instantane n'a ete repris.
  ajouterColonne(db, "decks", "history_pos", "INTEGER NOT NULL DEFAULT -1");
}

/** ALTER TABLE idempotent : SQLite n'a pas de « ADD COLUMN IF NOT EXISTS ». */
function ajouterColonne(db: Database.Database, table: string, colonne: string, definition: string) {
  const colonnes = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (colonnes.some((c) => c.name === colonne)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
}

export function db(): Database.Database {
  if (!globalForDb.__mtgDb) globalForDb.__mtgDb = open();
  return globalForDb.__mtgDb;
}

export const newId = () => crypto.randomUUID();

export type DeckRow = {
  id: string; name: string; format: string; description: string;
  theme: string; folder: string; tags: string; history_pos: number;
  created_at: string; updated_at: string;
};
export type DeckCardRow = {
  id: string; deck_id: string; card_id: string;
  quantity: number; zone: string; category: string; owned: string;
};
