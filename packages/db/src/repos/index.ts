/**
 * DNS Ops Workbench - Database Repositories
 *
 * Export all repository classes for database operations.
 */

// Re-export database adapter
export {
  createSimpleAdapter,
  type IDatabaseAdapter,
  SimpleDatabaseAdapter,
} from '../database/index.js';

// Domain repositories
export { type DomainFilter, DomainRepository } from './domain.js';
export { ObservationRepository } from './observation.js';
// Portfolio repositories
export {
  AlertRepository,
  AuditEventRepository,
  DomainNoteRepository,
  DomainTagRepository,
  MonitoredDomainRepository,
  SavedFilterRepository,
  TemplateOverrideRepository,
} from './portfolio.js';
export { RecordSetRepository } from './recordset.js';
export { RemediationRepository } from './remediation.js';
// Legacy repositories (using adapter pattern)
export { SnapshotRepository } from './snapshot.js';
