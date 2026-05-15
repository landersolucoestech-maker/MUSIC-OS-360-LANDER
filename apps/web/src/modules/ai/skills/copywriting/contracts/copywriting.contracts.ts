/**
 * skills/copywriting/contracts/copywriting.contracts.ts
 * Fonte: SKILL_copywriting.md (version 1.1.0)
 */

export type CopyPageType =
  | "homepage"
  | "landing-page"
  | "pricing"
  | "feature"
  | "about"
  | "press-release"
  | "email-marketing"
  | "ad-copy"
  | "bio";

export type CopyFormality = "casual" | "professional" | "formal";

export interface CopywritingInput {
  pageType: CopyPageType;
  artistName: string;
  productOrOffer?: string;
  targetAudience?: string;
  painPoints?: string[];
  keyBenefits?: string[];
  proofPoints?: string[];
  tone?: string;
  formality?: CopyFormality;
  primaryCTA?: string;
  language?: string;
  context?: string;
}

export interface CopywritingOutput {
  headline: string;
  subheadline: string;
  bodyCopy: string;
  cta: string;
  alternativeHeadlines?: string[];
  alternativeCTAs?: string[];
  metaTitle?: string;
  metaDescription?: string;
  pageType: CopyPageType;
  annotations?: string;
}
