/**
 * E2E Integration Tests: Probe Tenant Isolation - AUTH-003
 *
 * Tests that verify tenant isolation for probe operations:
 * 1. Tenant A cannot probe destinations allowlisted by tenant B
 * 2. Tenant-scoped allowlist entries are properly isolated
 * 3. Cross-tenant probe attempts are blocked
 * 4. Tenant-scoped observations are properly stored
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTenantAllowlist,
  ProbeAllowlistManager,
} from '../probes/allowlist.js';

// Mock dnssec-resolver
vi.mock('../dns/dnssec-resolver.js', () => ({
  queryDNSKEY: vi.fn().mockResolvedValue({ success: false, answers: [] }),
  queryDS: vi.fn().mockResolvedValue({ success: false, answers: [] }),
}));

describe('Probe Tenant Isolation E2E', () => {
  let manager: ProbeAllowlistManager;

  beforeEach(() => {
    manager = new ProbeAllowlistManager();
  });

  describe('Tenant-Scoped Allowlist Isolation', () => {
    it('should isolate allowlists between tenants', () => {
      const tenantA = manager.getTenantAllowlist('tenant-a');
      const tenantB = manager.getTenantAllowlist('tenant-b');

      // Tenant A adds a host
      tenantA.addCustomEntry('mail.tenant-a.com', 25, 'user', 'Test');

      // Tenant B should NOT see tenant A's host
      expect(manager.isAllowed('tenant-b', 'mail.tenant-a.com', 25)).toBe(false);

      // Tenant A should still see its own host
      expect(manager.isAllowed('tenant-a', 'mail.tenant-a.com', 25)).toBe(true);
    });

    it('should allow same hostname for different tenants', () => {
      const tenantA = manager.getTenantAllowlist('tenant-a');
      const tenantB = manager.getTenantAllowlist('tenant-b');

      // Both tenants add the same hostname
      tenantA.addCustomEntry('mx.example.com', 25, 'user-a', 'A');
      tenantB.addCustomEntry('mx.example.com', 25, 'user-b', 'B');

      // Both should be allowed for their respective tenants
      expect(manager.isAllowed('tenant-a', 'mx.example.com', 25)).toBe(true);
      expect(manager.isAllowed('tenant-b', 'mx.example.com', 25)).toBe(true);

      // But the entries should be separate
      const entriesA = tenantA.getAllEntries();
      const entriesB = tenantB.getAllEntries();
      expect(entriesA).toHaveLength(1);
      expect(entriesB).toHaveLength(1);
      expect(entriesA[0].tenantId).toBe('tenant-a');
      expect(entriesB[0].tenantId).toBe('tenant-b');
    });

    it('should isolate DNS result generation between tenants', () => {
      const tenantA = manager.getTenantAllowlist('tenant-a');
      const tenantB = manager.getTenantAllowlist('tenant-b');

      const mockDnsResults = [
        {
          success: true,
          query: { name: 'example.com', type: 'MX' as const },
          answers: [
            { name: 'example.com', type: 'MX' as const, ttl: 300, data: '10 mail.example.com' },
          ],
        },
      ];

      // Generate allowlist for both tenants
      tenantA.generateFromDnsResults('example.com', mockDnsResults);
      tenantB.generateFromDnsResults('example.com', mockDnsResults);

      // Both should have entries for mail.example.com
      expect(manager.isAllowed('tenant-a', 'mail.example.com', 25)).toBe(true);
      expect(manager.isAllowed('tenant-b', 'mail.example.com', 25)).toBe(true);

      // But the entries should have different tenantIds
      const entriesA = tenantA.getAllEntries();
      const entriesB = tenantB.getAllEntries();
      expect(entriesA[0].tenantId).toBe('tenant-a');
      expect(entriesB[0].tenantId).toBe('tenant-b');
    });

    it('should clear only affects current tenant', () => {
      const tenantA = manager.getTenantAllowlist('tenant-a');
      const tenantB = manager.getTenantAllowlist('tenant-b');

      tenantA.addCustomEntry('a.com', 25, 'test', 'A');
      tenantB.addCustomEntry('b.com', 25, 'test', 'B');

      tenantA.clear();

      expect(tenantA.getAllEntries()).toHaveLength(0);
      expect(tenantB.getAllEntries()).toHaveLength(1);
      expect(manager.isAllowed('tenant-a', 'a.com', 25)).toBe(false);
      expect(manager.isAllowed('tenant-b', 'b.com', 25)).toBe(true);
    });
  });

  describe('Cross-Tenant Probe Blocking', () => {
    it('should block probe to host allowlisted by different tenant', () => {
      // Tenant A has allowlisted a host
      const tenantA = manager.getTenantAllowlist('tenant-a');
      tenantA.addCustomEntry('mail.target.com', 25, 'tenant-a', 'Allowed');

      // Tenant B tries to probe the same host
      // Without allowlist entry for tenant B, this should be blocked
      expect(manager.isAllowed('tenant-b', 'mail.target.com', 25)).toBe(false);
    });

    it('should allow probe when tenant has its own allowlist entry', () => {
      // Both tenants add the same host to their allowlists
      const tenantA = manager.getTenantAllowlist('tenant-a');
      const tenantB = manager.getTenantAllowlist('tenant-b');

      tenantA.addCustomEntry('shared.mx.com', 25, 'tenant-a', 'Shared');
      tenantB.addCustomEntry('shared.mx.com', 25, 'tenant-b', 'Shared');

      // Both should be allowed for their respective tenants
      expect(manager.isAllowed('tenant-a', 'shared.mx.com', 25)).toBe(true);
      expect(manager.isAllowed('tenant-b', 'shared.mx.com', 25)).toBe(true);
    });
  });

  describe('Allowlist Manager Operations', () => {
    it('should return same instance for same tenant', () => {
      const instance1 = manager.getTenantAllowlist('tenant-x');
      const instance2 = manager.getTenantAllowlist('tenant-x');
      expect(instance1).toBe(instance2);
    });

    it('should clear specific tenant without affecting others', () => {
      manager.getTenantAllowlist('tenant-1').addCustomEntry('a.com', 25, 'test', '1');
      manager.getTenantAllowlist('tenant-2').addCustomEntry('b.com', 25, 'test', '2');
      manager.getTenantAllowlist('tenant-3').addCustomEntry('c.com', 25, 'test', '3');

      manager.clearTenant('tenant-2');

      expect(manager.isAllowed('tenant-1', 'a.com', 25)).toBe(true);
      expect(manager.isAllowed('tenant-2', 'b.com', 25)).toBe(false);
      expect(manager.isAllowed('tenant-3', 'c.com', 25)).toBe(true);
    });

    it('should clear all tenants', () => {
      manager.getTenantAllowlist('tenant-1').addCustomEntry('a.com', 25, 'test', '1');
      manager.getTenantAllowlist('tenant-2').addCustomEntry('b.com', 25, 'test', '2');

      manager.clearAll();

      expect(manager.getActiveTenants()).toHaveLength(0);
    });
  });

  describe('Empty/Invalid TenantId Handling', () => {
    it('should handle empty string tenantId', () => {
      const allowlist = createTenantAllowlist('');
      allowlist.addCustomEntry('test.com', 25, 'user', 'Test');

      // Should work but with empty tenantId
      const entries = allowlist.getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].tenantId).toBe('');
    });

    it('should handle undefined-like tenantId via manager', () => {
      // Manager uses string keys, so undefined would become string "undefined"
      const allowlist = manager.getTenantAllowlist('undefined' as string);
      allowlist.addCustomEntry('test.com', 25, 'user', 'Test');

      expect(manager.isAllowed('undefined' as string, 'test.com', 25)).toBe(true);
    });
  });
});
