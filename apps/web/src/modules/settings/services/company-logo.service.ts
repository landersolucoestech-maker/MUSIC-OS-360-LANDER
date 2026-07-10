/**
 * company-logo.service.ts — gestão da logo da empresa/workspace.
 *
 * MULTI-TENANT: a logo é sempre isolada por workspaceId. Nunca compartilhar
 * entre organizações.
 *
 *   `company-logo:{workspaceId}`. Espelha a última logo numa chave de preview
 *   público (`company-logo:__public__`) só para demonstrar, em dev, a
 *   renderização na página pública /cadastro/:slug.
 * - Produção: envia/lê via backend, usando o storage já existente do projeto
 *   (Cloudflare R2) sob `company-logos/{workspaceId}/logo`. Endpoints abaixo
 *   serão implementados no backend posteriormente.
 *
 * CONTRATO BACKEND (futuro):
 *   POST   /workspaces/{id}/logo   (multipart file)  -> { logoUrl }
 *   DELETE /workspaces/{id}/logo                       -> 204
 *   GET    /public/workspaces/{slug}                   -> { ..., logoUrl }
 */
import { API_BASE_URL } from "@/shared/lib/env";
import { getAccessToken, getTenantId } from "@/shared/lib/api-client";

export const ALLOWED_LOGO_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export const ALLOWED_LOGO_EXT = ["png", "jpg", "jpeg", "webp"];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB

export interface LogoValidationResult {
  ok: boolean;
  error?: string;
}


function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Lê os bytes mágicos e confirma que o conteúdo bate com um formato de imagem permitido. */
async function hasValidMagicBytes(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const b = (i: number) => buf[i];
  // PNG: 89 50 4E 47
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return true;
  // JPEG: FF D8 FF
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return true;
  // WEBP: "RIFF"...."WEBP"
  if (
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
  ) return true;
  return false;
}

/**
 * Valida o arquivo de logo no frontend: formato, tamanho e integridade real
 * (bytes mágicos — bloqueia executáveis e extensões mascaradas).
 */
export async function validateLogoFile(file: File): Promise<LogoValidationResult> {
  const ext = extOf(file.name);
  const mimeOk = (ALLOWED_LOGO_MIME as readonly string[]).includes(file.type);
  const extOk = ALLOWED_LOGO_EXT.includes(ext);

  if (!mimeOk || !extOk) {
    return { ok: false, error: "Formato inválido. Use PNG, JPG, JPEG ou WEBP." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio ou corrompido." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Arquivo muito grande. Tamanho máximo: 5 MB." };
  }
  if (!(await hasValidMagicBytes(file))) {
    return { ok: false, error: "O conteúdo do arquivo não corresponde a uma imagem válida." };
  }
  return { ok: true };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export const companyLogoService = {
  /** Retorna a logo do workspace (URL/dataURL) ou null se não houver. */
  async getLogo(workspaceId: string): Promise<string | null> {
    if (!workspaceId) return null;
    // Produção: o logoUrl vem agregado nos dados do workspace (backend).
    // Mantido aqui só por simetria — normalmente já existe no TenantConfig.
    return null;
  },

  /**
   * Valida e salva a logo. Retorna a URL/dataURL final.
   * Lança Error com mensagem amigável em caso de validação inválida.
   */
  async saveLogo(workspaceId: string, file: File): Promise<string> {
    if (!workspaceId) throw new Error("Workspace não identificado.");
    const validation = await validateLogoFile(file);
    if (!validation.ok) throw new Error(validation.error ?? "Arquivo inválido.");

    // Produção: upload multipart ao backend (R2). Endpoint a implementar no backend.
    const form = new FormData();
    form.append("file", file);
    const token = getAccessToken();
    const tenantId = getTenantId();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/workspaces/${encodeURIComponent(workspaceId)}/logo`,
      {
        method: "POST",
        body: form, // sem Content-Type manual: o browser define o boundary multipart
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
        },
      },
    );
    if (!res.ok) throw new Error("Falha ao enviar a logo. Tente novamente.");
    const payload = (await res.json()) as { data?: { logoUrl: string }; logoUrl?: string };
    return payload.data?.logoUrl ?? payload.logoUrl ?? "";
  },

  /** Remove a logo do workspace. */
  async removeLogo(workspaceId: string): Promise<void> {
    if (!workspaceId) return;
    const { api } = await import("@/shared/lib/api-client");
    await api.delete(`/workspaces/${encodeURIComponent(workspaceId)}/logo`);
  },
};
