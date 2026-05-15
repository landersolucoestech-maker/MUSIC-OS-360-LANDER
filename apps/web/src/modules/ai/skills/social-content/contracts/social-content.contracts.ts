/**
 * skills/social-content/contracts/social-content.contracts.ts
 *
 * Tipos de entrada e saída da skill social-content.
 */

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "facebook"
  | "threads"
  | "linkedin"
  | "spotify";

export type SocialContentFormat =
  | "post"
  | "caption"
  | "thread"
  | "carousel"
  | "short-video-script"
  | "story"
  | "bio";

export interface SocialContentInput {
  artistName: string;
  genre?: string;
  platform: SocialPlatform;
  format: SocialContentFormat;
  tone?: string;
  topic?: string;
  keywords?: string[];
  targetAudience?: string;
  language?: string;
  context?: string;
}

export interface SocialContentOutput {
  mainContent: string;
  hashtags?: string[];
  alternativeVersions?: string[];
  estimatedEngagement?: "baixo" | "médio" | "alto" | "muito alto";
  platform: SocialPlatform;
  format: SocialContentFormat;
  characterCount: number;
}
