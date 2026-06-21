import { useCallback, useEffect, useState } from "react";
import {
  DISTRIBUTION_PLATFORMS,
  DISTRIBUTOR_CONNECTIONS_KEY,
  getEnabledDistributionPlatforms,
  type ConnectedDistributionPlatform,
  type DistributionPlatform,
} from "@/modules/releases/services/distribution-platforms";

interface UseDistributionPlatformsResult {
  /** Catálogo completo suportado pelo sistema. */
  platforms: readonly DistributionPlatform[];
  /** Apenas as plataformas realmente conectadas/habilitadas. */
  enabledPlatforms: ConnectedDistributionPlatform[];
  /** Há pelo menos uma plataforma conectada? */
  hasAnyConnected: boolean;
}

/**
 * Expõe o catálogo de distribuidoras e o subconjunto efetivamente conectado.
 * Reage a mudanças de conexão (storage event) para refletir conexões feitas em
 * Configurações sem recarregar a página.
 */
export function useDistributionPlatforms(): UseDistributionPlatformsResult {
  const [enabledPlatforms, setEnabledPlatforms] = useState<ConnectedDistributionPlatform[]>(
    () => getEnabledDistributionPlatforms(),
  );

  const refresh = useCallback(() => {
    setEnabledPlatforms(getEnabledDistributionPlatforms());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISTRIBUTOR_CONNECTIONS_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return {
    platforms: DISTRIBUTION_PLATFORMS,
    enabledPlatforms,
    hasAnyConnected: enabledPlatforms.length > 0,
  };
}
