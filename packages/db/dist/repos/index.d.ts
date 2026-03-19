/**
 * DNS Ops Workbench - Database Repositories
 *
 * Export all repository classes for database operations.
 */
export { SimpleDatabaseAdapter, createSimpleAdapter, type IDatabaseAdapter, } from '../database/index.js';
export { DomainRepository, type DomainFilter } from './domain.js';
export { SnapshotRepository } from './snapshot.js';
export { ObservationRepository } from './observation.js';
export { RecordSetRepository } from './recordset.js';
export { RemediationRepository } from './remediation.js';
export { DomainNoteRepository, DomainTagRepository, SavedFilterRepository, AuditEventRepository, TemplateOverrideRepository, MonitoredDomainRepository, AlertRepository, } from './portfolio.js';
//# sourceMappingURL=index.d.ts.map