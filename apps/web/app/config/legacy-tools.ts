/**
 * Legacy Tools Configuration
 *
 * Configuration for integrating existing DMARC/DKIM tools.
 * These are external tools that remain authoritative until the new
 * rules engine achieves parity (Bead 09 shadow comparison).
 */

export interface LegacyToolConfig {
  name: string;
  description: string;
  baseUrl: string;
  supportDeepLink: boolean;
  supportEmbed: boolean;
  authRequired: boolean;
  iframeAllowed: boolean;
}

export interface LegacyToolsConfig {
  dmarc: LegacyToolConfig;
  dkim: LegacyToolConfig;
}

// Default configuration - URLs should be set via environment variables
export const defaultLegacyToolsConfig: LegacyToolsConfig = {
  dmarc: {
    name: 'DMARC Analyzer',
    description: 'Legacy DMARC validation and reporting tool',
    baseUrl: process.env.VITE_DMARC_TOOL_URL || 'https://dmarc.example.com',
    supportDeepLink: true,
    supportEmbed: false, // Most security tools block iframing
    authRequired: true,
    iframeAllowed: false,
  },
  dkim: {
    name: 'DKIM Validator',
    description: 'Legacy DKIM key and selector validation tool',
    baseUrl: process.env.VITE_DKIM_TOOL_URL || 'https://dkim.example.com',
    supportDeepLink: true,
    supportEmbed: false,
    authRequired: true,
    iframeAllowed: false,
  },
};

/**
 * Build a deep link URL to the legacy DMARC tool
 */
export function buildDmarcLink(config: LegacyToolConfig, domain: string): string {
  if (!config.supportDeepLink) {
    return config.baseUrl;
  }

  // Common URL patterns for DMARC tools
  const url = new URL(config.baseUrl);
  url.searchParams.set('domain', domain);
  url.searchParams.set('source', 'dns-ops-workbench');
  url.searchParams.set('returnUrl', encodeURIComponent(`${window.location.origin}/domain/${domain}?tab=mail`));
  return url.toString();
}

/**
 * Build a deep link URL to the legacy DKIM tool
 */
export function buildDkimLink(config: LegacyToolConfig, domain: string, selector?: string): string {
  if (!config.supportDeepLink) {
    return config.baseUrl;
  }

  const url = new URL(config.baseUrl);
  url.searchParams.set('domain', domain);
  if (selector) {
    url.searchParams.set('selector', selector);
  }
  url.searchParams.set('source', 'dns-ops-workbench');
  url.searchParams.set('returnUrl', encodeURIComponent(`${window.location.origin}/domain/${domain}?tab=mail`));
  return url.toString();
}

/**
 * Log access to legacy tool for shadow comparison analysis
 */
export async function logLegacyToolAccess(
  tool: 'dmarc' | 'dkim',
  domain: string,
  action: 'view' | 'navigate',
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await fetch('/api/legacy-tools/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        domain,
        action,
        timestamp: new Date().toISOString(),
        metadata,
      }),
    });
  } catch (error) {
    // Silent fail - logging should not break the user experience
    console.error('Failed to log legacy tool access:', error);
  }
}
