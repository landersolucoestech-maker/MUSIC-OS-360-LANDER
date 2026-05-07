/**
 * Barrel principal do módulo integrations.
 *
 * Cada integração possui seu próprio submodule em:
 *   modules/integrations/{provider}/index.ts
 *
 * Os paths legados (hooks/useXxx) continuam funcionando sem quebras.
 * Novo código deve importar via submodule ou via este barrel.
 */

// Integration registry — metadata for all integrations
export * from "./registry";

export * from "./hooks/useAbramus";
export * from "./hooks/useAppleMusic";
export * from "./hooks/useAutentique";
export * from "./hooks/useDeezer";
export * from "./hooks/useMetaAds";
export * from "./hooks/useResend";
export * from "./hooks/useSoundCloud";
export * from "./hooks/useSpotify";
export * from "./hooks/useStorage";
export * from "./hooks/useYouTube";
export * from "./components/AbramusConfigDialog";
export * from "./components/AutentiqueConfigDialog";
export * from "./components/MetaAdsConfigDialog";
export * from "./components/ResendConfigDialog";
