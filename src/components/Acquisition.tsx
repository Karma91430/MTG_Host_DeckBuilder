"use client";

import type { EntreeResolue } from "@/lib/deck";

/** Ce qu'il reste a acheter pour monter le deck, et ce que ca coute. */
export default function Acquisition({ entrees }: { entrees: EntreeResolue[] }) {
  const concernees = entrees.filter((e) => e.zone === "main" || e.zone === "command");
  const manquantes = concernees.filter((e) => (e.owned ?? "none") !== "have");
  if (manquantes.length === 0 || concernees.length === 0) return null;

  const prix = manquantes.reduce((s, e) => {
    const p = Number(e.carte.prices?.eur ?? e.carte.prices?.usd ?? 0);
    return s + (Number.isFinite(p) ? p * e.quantity : 0);
  }, 0);
  const possedees = concernees.length - manquantes.length;

  return (
    <div className="space-y-2 rounded-xl border border-bordure bg-panneau p-4">
      <p className="text-sm font-medium">Acquisition</p>
      <p className="text-2xl font-semibold">{Math.round(prix * 100) / 100} €</p>
      <p className="text-xs text-attenue">
        {manquantes.length} carte{manquantes.length > 1 ? "s" : ""} a acheter ·
        {" "}{possedees} deja possedee{possedees > 1 ? "s" : ""}
      </p>
    </div>
  );
}
