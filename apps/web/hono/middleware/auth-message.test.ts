/**
 * Regression test for auth error message information leakage
 *
 * BUG-010: 401 response body said "Provide CF-Access headers, X-API-Key,
 * or dev headers" — revealing the dev bypass mechanism to production users.
 * The auth bypass itself was gated by NODE_ENV=development, so it wasn't
 * exploitable, but the message was an unnecessary information leak.
 *
 * This test ensures the 401 message never reveals internal auth mechanism names.
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Env } from '../types.js';

describe('Auth error messages — no information leakage (BUG-010)', () => {
  it('401 response does not mention dev headers', async () => {
    // Import the actual middleware
    const { requireAuthMiddleware } = await import('./auth.js');

    const app = new Hono<Env>();
    app.use('*', requireAuthMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    // Make request without any auth
    const response = await app.request('/test');
    expect(response.status).toBe(401);

    const json = (await response.json()) as { message: string };

    // Message must not reveal internal auth mechanism names
    expect(json.message).not.toContain('X-Dev-Tenant');
    expect(json.message).not.toContain('X-Dev-Actor');
    expect(json.message).not.toContain('dev headers');
    expect(json.message).not.toContain('X-API-Key');
    expect(json.message).not.toContain('CF-Access');

    // It should just say authentication is required
    expect(json.message).toContain('Authentication required');
  });

  it('401 response body has standard error shape', async () => {
    const { requireAuthMiddleware } = await import('./auth.js');

    const app = new Hono<Env>();
    app.use('*', requireAuthMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    const response = await app.request('/test');
    const json = (await response.json()) as { error: string; message: string };

    expect(json.error).toBe('Unauthorized');
    expect(typeof json.message).toBe('string');
    // No other fields that could leak information
    const keys = Object.keys(json);
    expect(keys).toEqual(['error', 'message']);
  });
});
