/**
 * Webhook Notification Tests - PR-08.1
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWebhookPayload, isPrivateUrl, sendAlertWebhook } from './webhook.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Webhook SSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks RFC 1918 private IPs', () => {
    expect(isPrivateUrl('http://10.0.0.1:8080')).toBe(true);
    expect(isPrivateUrl('http://172.16.0.1:8080')).toBe(true);
    expect(isPrivateUrl('http://192.168.0.1:8080')).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isPrivateUrl('http://localhost:8080')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1:8080')).toBe(true);
  });

  it('allows public URLs', () => {
    expect(isPrivateUrl('https://webhook.example.com/alerts')).toBe(false);
  });
});

describe('Webhook Delivery', () => {
  const payload = {
    alertId: 'alert-123',
    title: 'Test',
    description: 'desc',
    severity: 'high' as const,
    domain: 'example.com',
    tenantId: 'tenant-1',
    timestamp: new Date().toISOString(),
    domain360Link: 'https://app.example.com/domain/example.com',
  };

  it('sends webhook successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await sendAlertWebhook('https://webhook.example.com', payload);
    expect(result.success).toBe(true);
  });

  it('blocks SSRF attempts', async () => {
    const result = await sendAlertWebhook('http://10.0.0.1/webhook', payload);
    expect(result.success).toBe(false);
    expect(result.error).toBe('SSRF_BLOCKED');
  });

  it('handles errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
    const result = await sendAlertWebhook('https://webhook.example.com', payload);
    expect(result.success).toBe(false);
  });
});

describe('buildWebhookPayload', () => {
  it('builds correct structure', () => {
    const alert = { id: 'a1', title: 'Test', severity: 'high', domain: 'ex.com', tenantId: 't1' };
    const payload = buildWebhookPayload(alert, 'https://app.example.com');
    expect(payload.alertId).toBe('a1');
    expect(payload.domain360Link).toContain('/domain/');
  });
});
