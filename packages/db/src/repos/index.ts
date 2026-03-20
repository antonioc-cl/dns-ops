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
export { FindingRepository } from './finding.js';
// Mail evidence repositories
export { DkimSelectorRepository, MailEvidenceRepository } from './mail-evidence.js';
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
// Parity evidence repositories
export {
  LegacyAccessLogRepository,
  MismatchReportRepository,
  ProviderBaselineRepository,
  ShadowComparisonRepository,
} from './parity.js';
export { RecordSetRepository } from './recordset.js';
export { RemediationRepository } from './remediation.js';
export { RulesetVersionRepository } from './ruleset-version.js';
// Legacy repositories (using adapter pattern)
export { SnapshotRepository } from './snapshot.js';
export { SuggestionRepository } from './suggestion.js';
