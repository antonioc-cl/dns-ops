import type { Context } from 'hono';
import { getEnvConfig } from '../config/env.js';
import type { Env } from '../types.js';

export interface CollectorProxyConfig {
  collectorUrl: string;
  headers: Record<string, string>;
}

export function getCollectorProxyConfig(
  c: Context<Env>,
  options?: { contentType?: string }
): CollectorProxyConfig | Response {
  const tenantId = c.get('tenantId');
  const actorId = c.get('actorId');

  if (!tenantId || !actorId) {
    return c.json({ error: 'Authenticated tenant and actor required' }, 401);
  }

  const { collectorUrl, internalSecret, isProduction } = getEnvConfig(c.env);
  const headers: Record<string, string> = {};

  if (options?.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  if (internalSecret) {
    headers['X-Internal-Secret'] = internalSecret;
    headers['X-Tenant-Id'] = tenantId;
    headers['X-Actor-Id'] = actorId;
    return { collectorUrl, headers };
  }

  if (isProduction) {
    return c.json({ error: 'Collector integration is not configured' }, 503);
  }

  headers['X-Dev-Tenant'] = tenantId;
  headers['X-Dev-Actor'] = actorId;
  return { collectorUrl, headers };
}
