import { useState, useEffect, useCallback } from "react";

export type LeadOAuthPlatform = "facebook" | "instagram" | "google_ads" | "tiktok" | "linkedin";

export interface LeadOAuthConnection {
  platform: LeadOAuthPlatform;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
  scopes?: string[];
  expiresAt?: string;
}

const STORAGE_KEY = "musicos360_lead_oauth_connections";

const MOCK_ACCOUNTS: Record<LeadOAuthPlatform, { accountName: string; accountId: string }> = {
  facebook: {
    accountName: "Music Business - Página Oficial",
    accountId: "act_123456789",
  },
  instagram: {
    accountName: "@musicbusiness_oficial",
    accountId: "IG_987654321",
  },
  google_ads: {
    accountName: "Music Business Ads (MCC)",
    accountId: "MCC-456-789-012",
  },
  tiktok: {
    accountName: "MusicBusiness TikTok Ads",
    accountId: "TT-ADV-7890123",
  },
  linkedin: {
    accountName: "Music Business - Conta Empresarial",
    accountId: "LI-ORG-456321",
  },
};

function loadConnections(): Partial<Record<LeadOAuthPlatform, LeadOAuthConnection>> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConnections(
  connections: Partial<Record<LeadOAuthPlatform, LeadOAuthConnection>>
): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

export function useLeadOAuth() {
  const [connections, setConnections] = useState<
    Partial<Record<LeadOAuthPlatform, LeadOAuthConnection>>
  >(loadConnections);

  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  const connect = useCallback(
    async (platform: LeadOAuthPlatform, scopes: string[]): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mock = MOCK_ACCOUNTS[platform];
          const now = new Date().toISOString();
          const expiresAt = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();

          setConnections((prev) => ({
            ...prev,
            [platform]: {
              platform,
              connected: true,
              accountName: mock.accountName,
              accountId: mock.accountId,
              connectedAt: now,
              expiresAt,
              scopes,
            },
          }));
          resolve();
        }, 1800);
      });
    },
    []
  );

  const disconnect = useCallback((platform: LeadOAuthPlatform): void => {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  }, []);

  const getConnection = useCallback(
    (platform: LeadOAuthPlatform): LeadOAuthConnection | undefined => {
      return connections[platform];
    },
    [connections]
  );

  const isConnected = useCallback(
    (platform: LeadOAuthPlatform): boolean => {
      return connections[platform]?.connected === true;
    },
    [connections]
  );

  return { connections, connect, disconnect, getConnection, isConnected };
}
