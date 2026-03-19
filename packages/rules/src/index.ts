/**
 * DNS Ops Workbench - Rules Package
 *
 * Deterministic rules engine and rule packs for DNS, mail, and delegation analysis.
 */

// Engine
export * from './engine/index.js';

// DNS Rules
export * from './dns/rules.js';

// Mail Rules (Bead 09)
export * from './mail/rules.js';
export * from './mail/templates.js';
export * from './mail/shadow.js';

// Re-export types
export type { Rule, RuleContext, RuleResult, Ruleset } from './engine/index.js';
