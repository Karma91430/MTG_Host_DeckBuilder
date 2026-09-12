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
    CREATE TABLE IF NOT EXISTS card_cache (
      id         TEXT PRIMARY KEY,
      payload    TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );
  `);
}

export function db(): Database.Database {
  if (!globalForDb.__mtgDb) globalForDb.__mtgDb = open();
  return globalForDb.__mtgDb;
}

export const newId = () => crypto.randomUUID();

export type DeckRow = {
  id: string; name: string; format: string; description: string;
  theme: string; created_at: string; updated_at: string;
};
export type DeckCardRow = {
  id: string; deck_id: string; card_id: string;
  quantity: number; zone: string; category: string;
};
