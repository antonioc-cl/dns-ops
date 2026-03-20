/**
 * DNS Ops Workbench - Database Repositories
 *
 * Export all repository classes for database operations.
 */
export { createSimpleAdapter, type IDatabaseAdapter, SimpleDatabaseAdapter, } from '../database/index.js';
export { type DomainFilter, DomainRepository } from './domain.js';
export { FindingRepository } from './finding.js';
export { DkimSelectorRepository, MailEvidenceRepository } from './mail-evidence.js';
export { ObservationRepository } from './observation.js';
export { LegacyAccessLogRepository, MismatchReportRepository, ProviderBaselineRepository, ShadowComparisonRepository, } from './parity.js';
export { AlertRepository, AuditEventRepository, DomainNoteRepository, DomainTagRepository, MonitoredDomainRepository, SavedFilterRepository, TemplateOverrideRepository, } from './portfolio.js';
export { RecordSetRepository } from './recordset.js';
export { RemediationRepository } from './remediation.js';
export { RulesetVersionRepository } from './ruleset-version.js';
export { SnapshotRepository } from './snapshot.js';
export { SuggestionRepository } from './suggestion.js';
//# sourceMappingURL=index.d.ts.map