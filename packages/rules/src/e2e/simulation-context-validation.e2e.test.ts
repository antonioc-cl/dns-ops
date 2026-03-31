/**
 * E2E Tests for Simulation Context Validation
 *
 * Tests for improved type validation in simulation context:
 * - Field type checking (not just existence)
 * - Invalid type detection
 * - Edge cases for context validation
 */

import { describe, expect, it } from 'vitest';
import {
  SimulationError,
  validateSimulationContext,
} from '../simulation/result.js';

describe('E2E: Simulation Context Type Validation', () => {
  describe('Basic Validation', () => {
    it('should accept valid context with all required fields', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [{ type: 'A', data: '192.0.2.1' }],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });

    it('should reject null context', () => {
      const result = validateSimulationContext(null);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });

    it('should reject undefined context', () => {
      const result = validateSimulationContext(undefined);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });

    it('should reject non-object context', () => {
      const result = validateSimulationContext('string');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });
  });

  describe('Required Field Validation', () => {
    it('should reject missing snapshotId', () => {
      const context = {
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
        expect(result.error.details?.missingField).toBe('snapshotId');
      }
    });

    it('should reject missing domainId', () => {
      const context = {
        snapshotId: 'snap-123',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.missingField).toBe('domainId');
      }
    });

    it('should reject missing domainName', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.missingField).toBe('domainName');
      }
    });

    it('should reject missing recordSets', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.missingField).toBe('recordSets');
      }
    });
  });

  describe('Type Validation', () => {
    it('should reject snapshotId that is not a string', () => {
      const context = {
        snapshotId: 123,
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
        expect(result.error.details?.field).toBe('snapshotId');
      }
    });

    it('should reject empty string snapshotId', () => {
      const context = {
        snapshotId: '',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.field).toBe('snapshotId');
      }
    });

    it('should reject domainId that is not a string', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: { id: 'domain-456' },
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.field).toBe('domainId');
      }
    });

    it('should reject domainName that is not a string', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 12345,
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.field).toBe('domainName');
      }
    });

    it('should reject recordSets that is not an array', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: { records: [] },
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.field).toBe('recordSets');
      }
    });

    it('should accept empty array for recordSets', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined fields vs missing fields', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: undefined,
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
    });

    it('should handle null fields', () => {
      const context = {
        snapshotId: null,
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      const context = {
        snapshotId: '   ',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      // Whitespace is technically a non-empty string, so this might pass
      // depending on strictness requirements
      const result = validateSimulationContext(context);
      
      // Current implementation accepts whitespace - document this behavior
      expect(result.isOk()).toBe(true);
    });

    it('should handle very long strings', () => {
      const context = {
        snapshotId: 'a'.repeat(1000),
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });

    it('should handle special characters in strings', () => {
      const context = {
        snapshotId: 'snap-123\nwith\tescape',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });

    it('should handle unicode in strings', () => {
      const context = {
        snapshotId: 'snap-日本語-🎉',
        domainId: 'domain-456',
        domainName: 'münchen.de',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });

    it('should handle array with mixed valid/invalid items', () => {
      const context = {
        snapshotId: 'snap-123',
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [
          { type: 'A', data: '192.0.2.1' },
          null,
          undefined,
          'string item',
        ],
      };

      // Current implementation only checks that recordSets is an array,
      // not the contents of the array
      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Error Structure', () => {
    it('should include field name in type validation errors', () => {
      const context = {
        snapshotId: 123,
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details).toBeDefined();
        expect(result.error.details?.field).toBe('snapshotId');
        expect(result.error.details?.value).toBe(123);
      }
    });

    it('should include expected type in error details', () => {
      const context = {
        snapshotId: 123,
        domainId: 'domain-456',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.expectedType).toBe('non-empty string');
      }
    });

    it('should provide consistent error code', () => {
      const contexts = [
        null,
        { domainId: 'x', domainName: 'x', recordSets: [] }, // missing snapshotId
        { snapshotId: 123, domainId: 'x', domainName: 'x', recordSets: [] }, // wrong type
      ];

      for (const ctx of contexts) {
        const result = validateSimulationContext(ctx);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe('INVALID_CONTEXT');
        }
      }
    });
  });
});
