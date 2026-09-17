"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEMES, symboleExtension } from "@/lib/themes";

const FORMATS = ["commander", "oathbreaker", "standard", "modern", "pioneer",
                 "legacy", "pauper", "brawl"];

export default function NouveauDeck() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [format, setFormat] = useState("commander");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nom, format, theme: themeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Creation impossible");
      router.push(`/decks/${data.id}`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Creation impossible");
      setOccupe(false);
    }
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)}
              className="rounded-md bg-accent px-4 py-2 font-medium text-accent-texte">
        Nouveau deck
      </button>
    );
  }

  return (
    <form onSubmit={creer}
          className="w-full rounded-lg border border-bordure bg-panneau p-4 sm:max-w-xl">
      <div className="flex flex-wrap gap-2">
        <input autoFocus required value={nom} onChange={(e) => setNom(e.target.value)}
               placeholder="Nom du deck" className="flex-1 min-w-48" />
        <select value={format} onChange={(e) => setFormat(e.target.value)} className="capitalize">
          {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <p className="mt-4 mb-2 text-sm text-attenue">Identite visuelle</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => setThemeId(t.id)}
                  title={t.ambiance}
                  className={`flex items-center gap-2 rounded-md border p-2 text-left text-xs ${
                    themeId === t.id ? "ring-2 ring-accent" : ""
                  }`}
                  style={{ background: t.couleurs.panneau, borderColor: t.couleurs.bordure,
                           color: t.couleurs.texte }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={symboleExtension(t.set)} alt="" width={16} height={16}
                 className="symbole-extension shrink-0" />
            <span className="truncate">{t.nom}</span>
            <span className="ml-auto h-3 w-3 shrink-0 rounded-full"
                  style={{ background: t.couleurs.accent }} />
          </button>
        ))}
      </div>

      {erreur && <p className="mt-3 text-sm text-red-400">{erreur}</p>}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={occupe}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-texte disabled:opacity-50">
          {occupe ? "Creation..." : "Creer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)}
                className="rounded-md border border-bordure px-4 py-2 text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}
