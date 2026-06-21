import type { IconType } from "react-icons";
import {
  SiCloudflare,
  SiGoogleanalytics,
  SiResend,
  SiSpotify,
  SiStripe,
  SiTiktok,
  SiTwilio,
} from "react-icons/si";
import { FaAws } from "react-icons/fa";

import abramusLogo from "@/assets/integrations/abramus.jpg";
import autentiqueLogo from "@/assets/integrations/autentique.png";
import clicksignLogo from "@/assets/integrations/clicksign.png";
import distrokidLogo from "@/assets/integrations/distrokid.png";
import docusignLogo from "@/assets/integrations/docusign.svg";
import ecadLogo from "@/assets/integrations/ecad.svg";
import googleAdsLogo from "@/assets/integrations/google-ads.png";
import googleBusinessLogo from "@/assets/integrations/google-g.webp";
import metaLogo from "@/assets/integrations/meta.png";
import musicproLogo from "@/assets/integrations/musicpro.jfif";
import nfeLogo from "@/assets/integrations/nfe.jpg";
import onerpmLogo from "@/assets/integrations/onerpm.png";
import somvibeLogo from "@/assets/integrations/somvibe.webp";
import soundonLogo from "@/assets/integrations/soundon.jpeg";
import symphonicLogo from "@/assets/integrations/symphonic.png";
import ubcLogo from "@/assets/integrations/ubc.png";

export type IntegrationLogoId =
  | "autentique"
  | "clicksign"
  | "docusign"
  | "ecad"
  | "abramus"
  | "ubc"
  | "meta_business"
  | "tiktok_business"
  | "google_business"
  | "spotify_ads"
  | "onerpm"
  | "distrokid"
  | "symphonic"
  | "soundon"
  | "somvibe"
  | "musicpro"
  | "stripe"
  | "resend"
  | "r2"
  | "aws_s3"
  | "google_analytics"
  | "twilio"
  | "nfe";

export interface IntegrationLogoMeta {
  name: string;
  src?: string;
  icon?: IconType;
  iconClassName?: string;
  backgroundClassName: string;
}

export const INTEGRATION_LOGOS: Record<IntegrationLogoId, IntegrationLogoMeta> = {
  autentique: { name: "Autentique", src: autentiqueLogo, backgroundClassName: "bg-white" },
  clicksign: { name: "Clicksign", src: clicksignLogo, backgroundClassName: "bg-white" },
  docusign: { name: "DocuSign", src: docusignLogo, backgroundClassName: "bg-white" },
  ecad: { name: "ECAD", src: ecadLogo, backgroundClassName: "bg-white" },
  abramus: { name: "ABRAMUS", src: abramusLogo, backgroundClassName: "bg-white" },
  ubc: { name: "UBC", src: ubcLogo, backgroundClassName: "bg-white" },
  meta_business: { name: "Meta Business Suite", src: metaLogo, backgroundClassName: "bg-white" },
  tiktok_business: {
    name: "TikTok Business",
    icon: SiTiktok,
    iconClassName: "text-black",
    backgroundClassName: "bg-white",
  },
  google_business: { name: "Google & YouTube", src: googleBusinessLogo, backgroundClassName: "bg-white" },
  spotify_ads: {
    name: "Spotify Ad Studio",
    icon: SiSpotify,
    iconClassName: "text-[#1DB954]",
    backgroundClassName: "bg-white",
  },
  onerpm: { name: "ONErpm", src: onerpmLogo, backgroundClassName: "bg-white" },
  distrokid: { name: "DistroKid", src: distrokidLogo, backgroundClassName: "bg-white" },
  symphonic: { name: "Symphonic", src: symphonicLogo, backgroundClassName: "bg-white" },
  soundon: { name: "SoundOn", src: soundonLogo, backgroundClassName: "bg-white" },
  somvibe: { name: "SomVibe", src: somvibeLogo, backgroundClassName: "bg-white" },
  musicpro: { name: "MusicPro", src: musicproLogo, backgroundClassName: "bg-white" },
  stripe: {
    name: "Stripe",
    icon: SiStripe,
    iconClassName: "text-[#635BFF]",
    backgroundClassName: "bg-white",
  },
  resend: {
    name: "Resend",
    icon: SiResend,
    iconClassName: "text-black",
    backgroundClassName: "bg-white",
  },
  r2: {
    name: "Cloudflare R2 / S3",
    icon: SiCloudflare,
    iconClassName: "text-[#F38020]",
    backgroundClassName: "bg-white",
  },
  aws_s3: {
    name: "Amazon S3",
    icon: FaAws,
    iconClassName: "text-[#FF9900]",
    backgroundClassName: "bg-white",
  },
  google_analytics: {
    name: "Google Analytics",
    icon: SiGoogleanalytics,
    iconClassName: "text-[#E37400]",
    backgroundClassName: "bg-white",
  },
  twilio: {
    name: "Twilio",
    icon: SiTwilio,
    iconClassName: "text-[#F22F46]",
    backgroundClassName: "bg-white",
  },
  nfe: { name: "NF-e", src: nfeLogo, backgroundClassName: "bg-white" },
};

export function getIntegrationLogo(id: IntegrationLogoId): IntegrationLogoMeta {
  return INTEGRATION_LOGOS[id];
}
