/**
 * DNS Ops Workbench - Database Repositories
 *
 * Export all repository classes for database operations.
 */

// Re-export database adapter
export {
  SimpleDatabaseAdapter,
  createSimpleAdapter,
  type IDatabaseAdapter,
} from '../database/index.js';

// Domain repositories
export { DomainRepository, type DomainFilter } from './domain.js';

// Legacy repositories (using adapter pattern)
export { SnapshotRepository } from './snapshot.js';
export { ObservationRepository } from './observation.js';
export { RecordSetRepository } from './recordset.js';
export { RemediationRepository } from './remediation.js';

// Portfolio repositories
export {
  DomainNoteRepository,
  DomainTagRepository,
  SavedFilterRepository,
  AuditEventRepository,
  TemplateOverrideRepository,
  MonitoredDomainRepository,
  AlertRepository,
} from './portfolio.js';
