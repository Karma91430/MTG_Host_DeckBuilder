import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deckbuilder MTG",
  description: "Construction, gestion et test de decks Magic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <header className="border-b border-bordure bg-panneau">
          <div className="mx-auto flex w-full max-w-none items-center gap-6 px-6 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Deck<span className="text-accent">builder</span>
            </Link>
            <nav className="flex gap-4 text-sm text-attenue">
              <Link href="/" className="hover:text-texte">Mes decks</Link>
            </nav>
            <span className="ml-auto text-xs text-attenue">
              Donnees et visuels fournis par Scryfall
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-none px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
