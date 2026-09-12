import { theme, variablesCss } from "@/lib/themes";

/**
 * Applique une identite visuelle a tout son contenu.
 *
 * Les couleurs passent par des variables CSS plutot que par des classes :
 * changer de theme ne recharge rien et ne duplique aucune regle Tailwind.
 */
export default function ThemeShell({
  id, children, className = "",
}: { id: string; children: React.ReactNode; className?: string }) {
  const t = theme(id);
  return (
    <div
      className={className}
      style={Object.fromEntries(
        variablesCss(t).split(";").map((p) => p.split(":") as [string, string]),
      ) as React.CSSProperties}
    >
      {children}
    </div>
  );
}
