/**
 * Mail checking module exports
 */

export {
  performMailCheck,
  checkDMARC,
  checkDKIM,
  checkSPF,
  PROVIDER_SELECTORS,
  COMMON_SELECTORS,
  type MailCheckResult,
  type RecordCheckResult,
  type DKIMCheckResult,
  type SelectorProvenance,
  type ProviderSelectorInfo,
} from './checker';

export { resolveTXT } from './dns';
