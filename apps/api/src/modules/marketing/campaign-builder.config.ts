export const campaignBuilderConfig = {
  objectives: [
    { value: 'REACH', label: 'Alcance', description: 'Aumentar a exposição da campanha para o maior número possível de pessoas.' },
    { value: 'TRAFFIC', label: 'Tráfego', description: 'Levar pessoas para um site, landing page, smart link ou canal externo.' },
    { value: 'ENGAGEMENT', label: 'Engajamento', description: 'Gerar curtidas, comentários, mensagens, compartilhamentos e interações.' },
    { value: 'CONVERSIONS', label: 'Conversões', description: 'Gerar vendas, inscrições, cadastros, pré-saves ou outras ações específicas.' },
  ],
  expectedOutcomes: {
    REACH: ['REACH', 'BRAND_AWARENESS', 'VIDEO_VIEWS'],
    TRAFFIC: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'WEBSITE_VISITS', 'SMART_LINK_CLICKS', 'WHATSAPP_CLICKS', 'PROFILE_VISITS'],
    ENGAGEMENT: ['POST_ENGAGEMENT', 'MESSAGES', 'COMMENTS', 'SHARES', 'FOLLOWERS', 'VIDEO_ENGAGEMENT'],
    CONVERSIONS: ['LEADS', 'SALES', 'PRE_SAVE', 'STREAMS', 'SIGNUPS', 'DOWNLOADS', 'WHATSAPP_CONTACT', 'FORM_SUBMISSION'],
  },
  promotedEntityTypes: ['ARTIST', 'MUSIC_PROJECT', 'RELEASE', 'TRACK', 'EP', 'ALBUM', 'VIDEO', 'EVENT', 'PRODUCT', 'SERVICE', 'BRAND', 'COMPANY', 'INSTITUTIONAL', 'OTHER'],
  platforms: {
    META_ADS: {
      objectives: ['REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS'],
      creatives: ['IMAGE', 'VIDEO', 'CAROUSEL'],
      placements: ['META_FEED', 'META_STORIES', 'META_REELS', 'META_EXPLORE', 'META_CAROUSEL'],
    },
    GOOGLE_ADS: {
      objectives: ['REACH', 'TRAFFIC', 'CONVERSIONS'],
      creatives: ['IMAGE', 'VIDEO', 'TEXT'],
      placements: ['GOOGLE_SEARCH', 'GOOGLE_DISPLAY', 'GOOGLE_DISCOVERY', 'YOUTUBE_IN_STREAM'],
    },
    YOUTUBE_ADS: {
      objectives: ['REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS'],
      creatives: ['VIDEO'],
      placements: ['YOUTUBE_IN_STREAM', 'YOUTUBE_SHORTS', 'YOUTUBE_SEARCH', 'YOUTUBE_DISCOVERY'],
    },
    TIKTOK_ADS: {
      objectives: ['REACH', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS'],
      creatives: ['VIDEO'],
      placements: ['TIKTOK_FOR_YOU', 'TIKTOK_SEARCH', 'TIKTOK_PROFILE_FEED'],
    },
    SPOTIFY_ADS: {
      objectives: ['REACH', 'TRAFFIC', 'CONVERSIONS'],
      creatives: ['AUDIO', 'VIDEO'],
      placements: ['SPOTIFY_AUDIO', 'SPOTIFY_VIDEO', 'SPOTIFY_HOMEPAGE', 'SPOTIFY_OVERLAY'],
    },
  },
  creativeTypes: ['IMAGE', 'VIDEO', 'AUDIO', 'CAROUSEL', 'TEXT'],
  statusLifecycle: ['DRAFT', 'READY', 'PENDING_REVIEW', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'REJECTED', 'COMPLETED', 'FAILED', 'ARCHIVED'],
  compatibilityRules: [
    'TRAFFIC exige destinationUrl.',
    'CONVERSIONS exige expectedOutcome.',
    'VIDEO_VIEWS exige criativo de vídeo.',
    'SPOTIFY_ADS exige áudio ou vídeo compatível.',
    'O objetivo deve ser compatível com as plataformas selecionadas.',
    'O resultado esperado deve ser compatível com o objetivo selecionado.',
  ],
  defaultRecommendations: {
    TRAFFIC: ['URL obrigatória', 'UTM recomendado', 'CTA: Saiba mais'],
    CONVERSIONS: ['Evento de conversão obrigatório', 'Landing page ou smart link recomendado', 'CTA específico por resultado'],
  },
};
