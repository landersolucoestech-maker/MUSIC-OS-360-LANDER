/**
 * shared/dev/DevProfileSwitcher.tsx
 *
 * Seletor de perfil para validação visual de RBAC — renderiza APENAS em MOCK_MODE.
 * Troca o perfil simulado, filtrando a navegação (ver AppSidebar). Não é
 * segurança real; serve para validar a experiência por setor.
 */

import { FlaskConical } from "lucide-react";
import { MOCK_MODE } from "@/shared/lib/env";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { DEV_PROFILE_LIST, setDevProfile, useDevProfile, type DevProfileId } from "./devProfiles";

export function DevProfileSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const profile = useDevProfile();
  if (!MOCK_MODE) return null;

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2" title="Perfil (simulação)">
        <FlaskConical className="h-4 w-4 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
        <FlaskConical className="h-3 w-3" />
        Perfil (simulação)
      </div>
      <Select value={profile} onValueChange={(v) => setDevProfile(v as DevProfileId)}>
        <SelectTrigger className="h-8 w-full text-xs" data-testid="dev-profile-switcher">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEV_PROFILE_LIST.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
