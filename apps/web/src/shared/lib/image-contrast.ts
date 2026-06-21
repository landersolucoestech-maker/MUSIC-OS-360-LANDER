/**
 * image-contrast — utilitário central de contraste sobre imagens (capas de release etc.).
 *
 * Analisa a luminância média de uma imagem para decidir se o conteúdo sobreposto
 * deve usar texto escuro (capa clara) ou texto claro (capa escura), garantindo
 * legibilidade/contraste sobre qualquer arte. Sem dependências externas.
 */

export type ContrastMode = "lightBackground" | "darkBackground";

const cache = new Map<string, ContrastMode>();
const inflight = new Map<string, Promise<ContrastMode>>();

/** Luminância relativa (WCAG) de um canal 0-255 normalizado. */
function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Decide o modo de contraste para uma imagem.
 * Faz downscale para um canvas pequeno e calcula a luminância relativa média.
 * Em erro/CORS (canvas "tainted") ou ausência de capa retorna `lightBackground`
 * (padrão seguro: o app tem fundo claro, então texto escuro permanece legível).
 */
export function getImageContrastMode(src: string | null | undefined): Promise<ContrastMode> {
  if (!src) return Promise.resolve("lightBackground");
  const cached = cache.get(src);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(src);
  if (pending) return pending;

  const task = new Promise<ContrastMode>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const settle = (mode: ContrastMode) => {
      cache.set(src, mode);
      inflight.delete(src);
      resolve(mode);
    };

    img.onload = () => {
      try {
        const w = 16;
        const h = 16;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return settle("darkBackground");
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha === 0) continue;
          const lum =
            0.2126 * channelLuminance(data[i]) +
            0.7152 * channelLuminance(data[i + 1]) +
            0.0722 * channelLuminance(data[i + 2]);
          sum += lum;
          count++;
        }
        const avg = count > 0 ? sum / count : 1;
        // Só usa texto claro quando a capa é positivamente escura (avg baixo).
        settle(avg < 0.45 ? "darkBackground" : "lightBackground");
      } catch {
        settle("lightBackground"); // canvas tainted (CORS) ou indisponível
      }
    };
    img.onerror = () => settle("lightBackground");
    img.src = src;
  });

  inflight.set(src, task);
  return task;
}

// ── Classes utilitárias (design system) por modo de contraste ───────────────────

/** Texto principal sobre capa. */
export const contrastText = (mode: ContrastMode): string =>
  mode === "lightBackground" ? "text-slate-900" : "text-slate-50";

/** Texto secundário/subtítulo sobre capa. */
export const contrastSubtext = (mode: ContrastMode): string =>
  mode === "lightBackground" ? "text-slate-700" : "text-slate-200";

/** "Chrome" sobreposto (ícones, bordas, botões, blocos translúcidos) sobre capa. */
export const contrastChrome = (mode: ContrastMode): string =>
  mode === "lightBackground"
    ? "text-slate-900 border-slate-900/20 bg-white/30"
    : "text-slate-50 border-white/20 bg-black/30";

/** Scrim (gradiente) que reforça a legibilidade do conteúdo na base do card. */
export const contrastScrim = (mode: ContrastMode): string =>
  mode === "lightBackground"
    ? "bg-gradient-to-t from-white/85 via-white/35 to-transparent"
    : "bg-gradient-to-t from-black/85 via-black/35 to-transparent";
