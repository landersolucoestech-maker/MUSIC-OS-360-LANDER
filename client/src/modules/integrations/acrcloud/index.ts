/**
 * integrations/acrcloud/index.ts
 *
 * ACRCloud — Plataforma de monitoramento musical por fingerprint de áudio.
 *
 * Funcionalidades:
 *   - Identificação de músicas por fingerprint de áudio em tempo real
 *   - Relatórios de execução em rádio, TV, streaming e vídeo
 *   - Alertas de uso não autorizado
 *   - Projetos de monitoramento por artista/obra/ISRC
 *
 * Contrato:  shared/integrations/contracts/music-monitoring.contract → IMusicMonitoringProvider
 * Hook:      modules/integrations/hooks/useACRCloud
 * Mock:      integrations/providers/mock/mock-music-monitoring.provider
 *
 * ESTADO ACTUAL: mock funcional (useACRCloud.ts + MockMusicMonitoringProvider).
 * MIGRAÇÃO FUTURA:
 *   1. Substituir MockMusicMonitoringProvider por ACRCloudProvider (API v2)
 *   2. Endpoints: https://eu-api.acrcloud.com (Europe) ou https://us-api.acrcloud.com
 *   3. Credenciais: access_key + access_secret + host (bucket-specific)
 *   4. SDK oficial: @acrcloud/acrcloud-js
 *
 * Documentação oficial: https://docs.acrcloud.com/reference/api-overview
 */
export {};
