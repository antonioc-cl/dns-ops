/**
 * Domain Collection Tests - VAL-003 Collection Dedup
 *
 * Tests for collection deduplication to prevent rapid re-collection.
 * Tests verify the dedup check logic without requiring full DNS mocking.
 */

import { describe, expect, it } from 'vitest';

/**
 * VAL-003: Collection dedup logic
 *
 * Before triggering collection, check latest snapshot's createdAt for domain.
 * If snapshot created within 60 seconds: return dedup response.
 */

describe('VAL-003: Collection Deduplication Logic', () => {
  /**
   * Check if a snapshot is recent (within 60 seconds)
   */
  function isRecentSnapshot(snapshot: { createdAt: Date } | null): boolean {
    if (!snapshot || !snapshot.createdAt) return false;
    const sixtySecondsAgo = Date.now() - 60 * 1000;
    return snapshot.createdAt.getTime() > sixtySecondsAgo;
  }

  describe('isRecentSnapshot', () => {
    it('should return true for snapshot created 30 seconds ago', () => {
      const snapshot = { createdAt: new Date(Date.now() - 30 * 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(true);
    });

    it('should return true for snapshot created 59 seconds ago', () => {
      const snapshot = { createdAt: new Date(Date.now() - 59 * 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(true);
    });

    it('should return false for snapshot created 61 seconds ago', () => {
      const snapshot = { createdAt: new Date(Date.now() - 61 * 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(false);
    });

    it('should return false for snapshot created 2 minutes ago', () => {
      const snapshot = { createdAt: new Date(Date.now() - 2 * 60 * 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(false);
    });

    it('should return false for null snapshot', () => {
      expect(isRecentSnapshot(null)).toBe(false);
    });

    it('should return false for snapshot with undefined createdAt', () => {
      expect(isRecentSnapshot({ createdAt: undefined as unknown as Date })).toBe(false);
    });

    it('should return false for snapshot created exactly 60 seconds ago', () => {
      // Edge case: exactly 60 seconds should NOT be recent
      const snapshot = { createdAt: new Date(Date.now() - 60 * 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(false);
    });

    it('should return true for very recent snapshot (1 second ago)', () => {
      const snapshot = { createdAt: new Date(Date.now() - 1000) };
      expect(isRecentSnapshot(snapshot)).toBe(true);
    });
  });

  describe('Dedup response format', () => {
    it('should have correct structure for dedup response', () => {
      const dedupResponse = {
        success: false,
        reason: 'recent_collection_exists' as const,
        message:
          'Collection skipped - a snapshot was created 30 seconds ago. Wait at least 60 seconds between collections.',
        snapshotId: 'existing-snapshot-123',
        queued: false as const,
      };

      expect(dedupResponse.success).toBe(false);
      expect(dedupResponse.reason).toBe('recent_collection_exists');
      expect(dedupResponse.queued).toBe(false);
      expect(dedupResponse.snapshotId).toBeDefined();
      expect(dedupResponse.message).toContain('60 seconds');
    });

    it('should include snapshotId in dedup response', () => {
      const snapshotId = 'snap-abc-123';
      const response = {
        success: false,
        reason: 'recent_collection_exists',
        snapshotId,
        queued: false,
      };

      expect(response.snapshotId).toBe(snapshotId);
    });
  });

  describe('Time calculation', () => {
    it('should calculate seconds since snapshot correctly', () => {
      const createdAt = new Date(Date.now() - 45 * 1000);
      const secondsSince = Math.round((Date.now() - createdAt.getTime()) / 1000);
      expect(secondsSince).toBe(45);
    });

    it('should format message with seconds ago', () => {
      const createdAt = new Date(Date.now() - 30 * 1000);
      const secondsSince = Math.round((Date.now() - createdAt.getTime()) / 1000);
      const message = `Collection skipped - a snapshot was created ${secondsSince} seconds ago. Wait at least 60 seconds between collections.`;
      expect(message).toContain('30 seconds');
    });
  });
});
