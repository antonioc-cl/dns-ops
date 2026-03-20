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
  /** Base URL for the tool. If undefined, the tool is not available. */
  baseUrl: string | undefined;
  /** Whether deep-linking is supported (requires baseUrl to be set) */
  supportDeepLink: boolean;
  supportEmbed: boolean;
  authRequired: boolean;
  iframeAllowed: boolean;
  /** Whether the tool is available (baseUrl is configured) */
  available: boolean;
}

export interface LegacyToolsConfig {
  dmarc: LegacyToolConfig;
  dkim: LegacyToolConfig;
}

/**
 * Get legacy tools configuration
 *
 * Returns configuration with availability based on environment variables.
 * Tools without configured URLs are marked as unavailable and will not
 * expose dead-end placeholder links.
 */
export function getLegacyToolsConfig(): LegacyToolsConfig {
  const dmarcUrl = process.env.VITE_DMARC_TOOL_URL;
  const dkimUrl = process.env.VITE_DKIM_TOOL_URL;

  return {
    dmarc: {
      name: 'DMARC Analyzer',
      description: 'Legacy DMARC validation and reporting tool',
      baseUrl: dmarcUrl,
      supportDeepLink: !!dmarcUrl,
      supportEmbed: false, // Most security tools block iframing
      authRequired: true,
      iframeAllowed: false,
      available: !!dmarcUrl,
    },
    dkim: {
      name: 'DKIM Validator',
      description: 'Legacy DKIM key and selector validation tool',
      baseUrl: dkimUrl,
      supportDeepLink: !!dkimUrl,
      supportEmbed: false,
      authRequired: true,
      iframeAllowed: false,
      available: !!dkimUrl,
    },
  };
}

// For backward compatibility - evaluates at import time
// Prefer getLegacyToolsConfig() for runtime evaluation
export const defaultLegacyToolsConfig: LegacyToolsConfig = getLegacyToolsConfig();

/**
 * Build a deep link URL to the legacy DMARC tool
 *
 * @returns The deep link URL, or null if the tool is not available
 */
export function buildDmarcLink(config: LegacyToolConfig, domain: string): string | null {
  if (!config.available || !config.baseUrl) {
    return null;
  }

  if (!config.supportDeepLink) {
    return config.baseUrl;
  }

  // Common URL patterns for DMARC tools
  const url = new URL(config.baseUrl);
  url.searchParams.set('domain', domain);
  url.searchParams.set('source', 'dns-ops-workbench');
  url.searchParams.set(
    'returnUrl',
    encodeURIComponent(`${window.location.origin}/domain/${domain}?tab=mail`)
  );
  return url.toString();
}

/**
 * Build a deep link URL to the legacy DKIM tool
 *
 * @returns The deep link URL, or null if the tool is not available
 */
export function buildDkimLink(
  config: LegacyToolConfig,
  domain: string,
  selector?: string
): string | null {
  if (!config.available || !config.baseUrl) {
    return null;
  }

  if (!config.supportDeepLink) {
    return config.baseUrl;
  }

  const url = new URL(config.baseUrl);
  url.searchParams.set('domain', domain);
  if (selector) {
    url.searchParams.set('selector', selector);
  }
  url.searchParams.set('source', 'dns-ops-workbench');
  url.searchParams.set(
    'returnUrl',
    encodeURIComponent(`${window.location.origin}/domain/${domain}?tab=mail`)
  );
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
