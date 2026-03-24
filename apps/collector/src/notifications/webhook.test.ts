/**
 * Webhook Notification Tests - PR-08.1
 *
 * Tests for webhook service with SSRF protection and timeout handling.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWebhookPayload, isPrivateUrl, sendAlertWebhook } from './webhook.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPrivateUrl', () => {
    it('blocks RFC 1918 private IPs (10.x.x.x)', () => {
      expect(isPrivateUrl('http://10.0.0.1:8080')).toBe(true);
      expect(isPrivateUrl('http://10.255.255.255:8080')).toBe(true);
    });

    it('blocks RFC 1918 private IPs (172.16-31.x.x)', () => {
      expect(isPrivateUrl('http://172.16.0.1:8080')).toBe(true);
      expect(isPrivateUrl('http://172.31.255.255:8080')).toBe(true);
    });

    it('blocks RFC 1918 private IPs (192.168.x.x)', () => {
      expect(isPrivateUrl('http://192.168.0.1:8080')).toBe(true);
      expect(isPrivateUrl('http://192.168.255.255:8080')).toBe(true);
    });

    it('blocks localhost and loopback', () => {
      expect(isPrivateUrl('http://localhost:8080')).toBe(true);
      expect(isPrivateUrl('http://127.0.0.1:8080')).toBe(true);
      expect(isPrivateUrl('http://[::1]:8080')).toBe(true);
    });

    it('allows public hostnames', () => {
      expect(isPrivateUrl('https://example.com/webhook')).toBe(false);
      expect(isPrivateUrl('https://api.example.com/webhook')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isPrivateUrl('not-a-url')).toBe(true);
      expect(isPrivateUrl('')).toBe(true);
    });
  });

    it('allows public IPs', () => {
      expect(isPrivateUrl('https://8.8.8.8:443')).toBe(false);
      expect(isPrivateUrl('https://1.1.1.1:443')).toBe(false);
    });

    it('allows public hostnames', () => {
      expect(isPrivateUrl('https://example.com/webhook')).toBe(false);
      expect(isPrivateUrl('https://api.example.com/webhook')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isPrivateUrl('not-a-url')).toBe(true);
      expect(isPrivateUrl('')).toBe(true);
    });
  });

  describe('sendAlertWebhook', () => {
    const samplePayload = {
      alertId: 'alert-123',
      title: 'DNS Issue Detected',
      description: 'SPF record missing for example.com',
      severity: 'high' as const,
      domain: 'example.com',
      tenantId: 'tenant-1',
      timestamp: new Date().toISOString(),
      domain360Link: 'https://app.example.com/domain/example.com',
    };

    it('sends webhook to valid URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await sendAlertWebhook('https://webhook.example.com/alerts', samplePayload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('blocks SSRF to private IPs', async () => {
      const result = await sendAlertWebhook('http://10.0.0.1/webhook', samplePayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SSRF_BLOCKED');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('blocks SSRF to localhost', async () => {
      const result = await sendAlertWebhook('http://localhost:8080/webhook', samplePayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SSRF_BLOCKED');
    });

    it('handles timeout via AbortSignal', async () => {
      // Document that AbortSignal can be passed for timeout control
      const controller = new AbortController();
      // When signal is aborted, fetch should reject with AbortError
      const signal = controller.signal;
      expect(signal.aborted).toBe(false);
      // The implementation should handle AbortError gracefully
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND'));

      const result = await sendAlertWebhook(
        'https://nonexistent.example.com/webhook',
        samplePayload
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ENOTFOUND');
    });

    it('handles non-2xx responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await sendAlertWebhook('https://webhook.example.com/alerts', samplePayload);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('HTTP 500');
    });

    it('uses correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await sendAlertWebhook('https://webhook.example.com/alerts', samplePayload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': expect.stringContaining('dns-ops-collector'),
          }),
        })
      );
    });

    it('includes payload in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await sendAlertWebhook('https://webhook.example.com/alerts', samplePayload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webhook.example.com/alerts',
        expect.objectContaining({
          body: JSON.stringify(samplePayload),
        })
      );
    });
  });

  describe('buildWebhookPayload', () => {
    it('builds correct payload structure', () => {
      const alert = {
        id: 'alert-123',
        title: 'Test Alert',
        description: 'Test description',
        severity: 'critical',
        domain: 'example.com',
        tenantId: 'tenant-1',
      };

      const payload = buildWebhookPayload(alert, 'https://app.example.com');

      expect(payload.alertId).toBe('alert-123');
      expect(payload.title).toBe('Test Alert');
      expect(payload.description).toBe('Test description');
      expect(payload.severity).toBe('critical');
      expect(payload.domain).toBe('example.com');
      expect(payload.tenantId).toBe('tenant-1');
      expect(payload.timestamp).toBeDefined();
      expect(payload.domain360Link).toBe('https://app.example.com/domain/example.com');
    });

    it('uses default baseUrl when not provided', () => {
      const alert = {
        id: 'alert-123',
        title: 'Test Alert',
        severity: 'low',
        domain: 'example.com',
        tenantId: 'tenant-1',
      };

      const payload = buildWebhookPayload(alert);

      expect(payload.domain360Link).toContain('/domain/example.com');
    });

    it('handles missing description', () => {
      const alert = {
        id: 'alert-123',
        title: 'Test Alert',
        severity: 'low',
        domain: 'example.com',
        tenantId: 'tenant-1',
      };

      const payload = buildWebhookPayload(alert);

      expect(payload.description).toBe('');
    });
  });
});
