export interface MusicaData {
  id?: string;
  nome?: string;
  soloFeat?: string;
  originalRemix?: string;
  instrumental?: string;
  duracaoMin?: string;
  duracaoSeg?: string;
  genero?: string;
  idioma?: string;
  compositores?: string[];
  interpretes?: string[];
  produtores?: string[];
  letra?: string;
  audioUrl?: string;
  /** Local-only: file metadata derived from a local File pick or a HEAD request on audioUrl.
   *  Never persisted to descricao JSON. */
  arquivoAudio?: { name: string; size: number } | null;
}

export interface MusicaInfo {
  nome: string;
  genero: string;
  idioma: string;
  compositores: string;
  interpretes: string;
  produtores: string;
  duracao: string;
  soloFeat: string;
  originalRemix: string;
  instrumental: string;
  letra: string;
  audioUrl: string;
}

export function parseMusicasFromProjeto(projeto: { descricao?: string | null } | null | undefined): MusicaData[] {
  if (!projeto?.descricao) return [];
  try {
    const parsed = JSON.parse(projeto.descricao);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as MusicaData[];
  } catch { /* ignore */ }
  return [];
}

function joinArray(arr: string[] | string | undefined | null): string {
  if (!arr) return "";
  if (Array.isArray(arr)) return arr.filter(Boolean).join(", ");
  return arr;
}

export function getMusicaInfo(m: MusicaData): MusicaInfo {
  const min = m.duracaoMin || "";
  const seg = m.duracaoSeg || "";
  const duracao = min && seg ? `${min}:${seg.padStart(2, "0")}` : min ? `${min}:00` : "";
  return {
    nome: m.nome || "",
    genero: m.genero || "",
    idioma: m.idioma || "",
    compositores: joinArray(m.compositores),
    interpretes: joinArray(m.interpretes),
    produtores: joinArray(m.produtores),
    duracao,
    soloFeat: m.soloFeat || "solo",
    originalRemix: m.originalRemix || "original",
    instrumental: m.instrumental || "nao",
    letra: m.letra || "",
    audioUrl: m.audioUrl || "",
  };
}

export function getFirstMusicaInfo(projeto: { descricao?: string | null } | null | undefined): MusicaInfo {
  const musicas = parseMusicasFromProjeto(projeto);
  if (musicas.length === 0) {
    return {
      nome: "", genero: "", idioma: "", compositores: "", interpretes: "",
      produtores: "", duracao: "", soloFeat: "solo", originalRemix: "original",
      instrumental: "nao", letra: "", audioUrl: "",
    };
  }
  return getMusicaInfo(musicas[0]);
}
