/**
 * DNS Ops Workbench - Database Repositories
 *
 * Export all repository classes for database operations.
 */

// Re-export database types and adapters
export {
  PostgresAdapter,
  D1Adapter,
  createAdapter,
  type IDatabaseAdapter,
  type QueryResult,
  type ConnectionConfig,
  type PostgresConnectionConfig,
  type D1ConnectionConfig,
} from '../database/index.js';

// Domain repositories
export { DomainRepository, type DomainFilter } from './domain.js';

// Legacy repositories (to be migrated to adapter pattern)
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
