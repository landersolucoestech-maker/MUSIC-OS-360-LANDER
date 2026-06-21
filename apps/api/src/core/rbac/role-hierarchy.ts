import { FunctionalRole, SystemRole } from '@music-os-360/types';

export const ROLE_HIERARCHY: Record<string, number> = {
  [SystemRole.SUPER_ADMIN]: 100,
  [SystemRole.TENANT_OWNER]: 90,
  [SystemRole.OWNER]: 90,
  [SystemRole.ADMIN]: 80,
  [SystemRole.MANAGER]: 70,
  [SystemRole.EDITOR]: 60,
  [SystemRole.VIEWER]: 10,
  [FunctionalRole.FINANCIAL]: 60,
  [FunctionalRole.ACCOUNTING]: 60,
  [FunctionalRole.JURIDICO]: 55,
  [FunctionalRole.MARKETING]: 50,
  [FunctionalRole.MARKETING_MANAGER]: 55,
  [FunctionalRole.ARTIST]: 30,
  [FunctionalRole.ARTISTA]: 30,
  [FunctionalRole.PRODUTOR]: 40,
  [FunctionalRole.COMERCIAL]: 45,
  [FunctionalRole.COLABORADOR]: 20,
  [FunctionalRole.RH_MANAGER]: 55,
  [FunctionalRole.RADIO]: 40,
  [FunctionalRole.TV]: 40,
};
