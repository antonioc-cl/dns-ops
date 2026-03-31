import { describe, expect, it } from 'vitest';
import {
  getActionableFindingTypes,
  isActionableFindingType,
  isSimulationError,
  SimulationError,
  simulationResult,
  validateSimulationContext,
} from './result.js';

describe('Simulation Result Utilities', () => {
  describe('SimulationError', () => {
    it('should create a basic SimulationError', () => {
      const error = new SimulationError({
        message: 'Test error',
        code: 'SIMULATION_FAILED',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('SIMULATION_FAILED');
      expect(error._tag).toBe('ValidationError');
    });

    it('should create invalid finding type error', () => {
      const error = SimulationError.invalidFindingType('unknown.type');

      expect(error.code).toBe('INVALID_FINDING_TYPE');
      expect(error.findingType).toBe('unknown.type');
      expect(error.message).toContain('unknown.type');
    });

    it('should create no actionable findings error', () => {
      const error = SimulationError.noActionableFindings();

      expect(error.code).toBe('NO_ACTIONABLE_FINDINGS');
      expect(error.message).toContain('No actionable');
    });

    it('should include details in error', () => {
      const error = new SimulationError({
        message: 'Complex error',
        code: 'SIMULATION_FAILED',
        findingType: 'mail.no-spf',
        details: { step: 'inversion', progress: 50 },
      });

      expect(error.details?.step).toBe('inversion');
      expect(error.details?.progress).toBe(50);
    });
  });

  describe('isSimulationError', () => {
    it('should return true for SimulationError', () => {
      const error = SimulationError.invalidFindingType('test');
      expect(isSimulationError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isSimulationError(new Error('test'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSimulationError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSimulationError(undefined)).toBe(false);
    });
  });

  describe('simulationResult', () => {
    it('should return Ok for successful simulation', () => {
      const result = simulationResult(() => ({
        changes: [],
        resolved: 5,
      }));

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.resolved).toBe(5);
      }
    });

    it('should return Err for failed simulation', () => {
      const result = simulationResult(() => {
        throw new Error('Simulation crashed');
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('SIMULATION_FAILED');
        expect(result.error.message).toContain('Simulation crashed');
      }
    });

    it('should handle non-Error throws', () => {
      const result = simulationResult(() => {
        throw 42;
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('SIMULATION_FAILED');
      }
    });
  });

  describe('getActionableFindingTypes', () => {
    it('should return list of actionable types', () => {
      const types = getActionableFindingTypes();

      expect(types).toContain('mail.no-spf-record');
      expect(types).toContain('mail.no-dmarc-record');
      expect(types).toContain('mail.no-mx-record');
      expect(types).toContain('dns.cname-coexistence-conflict');
      expect(types.length).toBeGreaterThan(5);
    });
  });

  describe('isActionableFindingType', () => {
    it('should return true for actionable types', () => {
      expect(isActionableFindingType('mail.no-spf-record')).toBe(true);
      expect(isActionableFindingType('mail.no-dmarc-record')).toBe(true);
      expect(isActionableFindingType('dns.cname-coexistence-conflict')).toBe(true);
    });

    it('should return false for non-actionable types', () => {
      expect(isActionableFindingType('mail.already-configured')).toBe(false);
      expect(isActionableFindingType('dns.valid-record')).toBe(false);
      expect(isActionableFindingType('unknown.type')).toBe(false);
    });
  });

  describe('validateSimulationContext', () => {
    it('should return Ok for valid context', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        domainName: 'example.com',
        recordSets: [],
        observations: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });

    it('should return Err for null context', () => {
      const result = validateSimulationContext(null);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });

    it('should return Err for undefined context', () => {
      const result = validateSimulationContext(undefined);

      expect(result.isErr()).toBe(true);
    });

    it('should return Err for missing snapshotId', () => {
      const context = {
        domainId: 'domain-1',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });

    it('should return Err for missing domainId', () => {
      const context = {
        snapshotId: 'snap-1',
        domainName: 'example.com',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
    });

    it('should return Err for missing domainName', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        recordSets: [],
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
    });

    it('should return Err for missing recordSets', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        domainName: 'example.com',
      };

      const result = validateSimulationContext(context);

      expect(result.isErr()).toBe(true);
    });

    it('should return Ok for extra fields', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        domainName: 'example.com',
        recordSets: [],
        extraField: 'extra',
        anotherExtra: 123,
      };

      const result = validateSimulationContext(context);

      expect(result.isOk()).toBe(true);
    });
  });
});
