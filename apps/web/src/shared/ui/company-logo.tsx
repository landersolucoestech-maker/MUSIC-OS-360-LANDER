import { cn } from "@/shared/lib/utils";

/**
 * CompanyLogo — identidade visual da organização com fallback automático.
 *
 * - Se `logoUrl` existir: renderiza a imagem com object-contain (sem cortar /
 *   sem distorcer / mantém proporção).
 * - Caso contrário: renderiza as iniciais do nome da empresa (placeholder).
 *
 * Usado em áreas públicas e privadas que dependem da identidade da empresa.
 */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  /** Classes do container (tamanho/raio/etc). */
  className?: string;
  /** Classes do texto de fallback (iniciais). */
  textClassName?: string;
}

export function CompanyLogo({ name, logoUrl, className, textClassName }: CompanyLogoProps) {
  const base =
    "flex items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-primary/10";

  if (logoUrl) {
    return (
      <div className={cn(base, className)}>
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={cn(base, className)}>
      <span className={cn("font-bold tracking-tight text-primary", textClassName)}>
        {initialsOf(name)}
      </span>
    </div>
  );
}
