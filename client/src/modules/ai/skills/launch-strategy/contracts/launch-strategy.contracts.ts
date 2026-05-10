/**
 * skills/launch-strategy/contracts/launch-strategy.contracts.ts
 * Fonte: SKILL_(2)_launch-strategy.md (version 1.1.0)
 */

export type LaunchType =
  | "single"
  | "ep"
  | "album"
  | "feature"
  | "product-hunt"
  | "beta"
  | "early-access"
  | "full-launch";

export type LaunchPhase =
  | "internal"
  | "alpha"
  | "beta"
  | "early-access"
  | "full";

export interface LaunchStrategyInput {
  artistName: string;
  projectName: string;
  launchType: LaunchType;
  targetPhase?: LaunchPhase;
  audienceSize?: string;
  ownedChannels?: string[];
  rentedChannels?: string[];
  timeline?: string;
  budget?: string;
  genre?: string;
  context?: string;
  language?: string;
}

export interface LaunchPhaseDetail {
  phase: LaunchPhase;
  duration: string;
  actions: string[];
  goal: string;
}

export interface LaunchStrategyOutput {
  summary: string;
  orbStrategy: {
    owned: string[];
    rented: string[];
    borrowed: string[];
  };
  phases: LaunchPhaseDetail[];
  preLaunchChecklist: string[];
  launchDayChecklist: string[];
  postLaunchChecklist: string[];
  kpis: string[];
  productHuntTips?: string[];
  projectName: string;
  artistName: string;
}
