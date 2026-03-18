/**
 * Mail check types for UI components
 */

export interface MailCheckResult {
  dmarc: {
    present: boolean;
    valid: boolean;
    errors?: string[];
  };
  dkim: {
    present: boolean;
    valid: boolean;
    selector?: string;
    selectorProvenance?: 'managed' | 'heuristic' | 'operator' | 'default';
    triedSelectors?: string[];
    errors?: string[];
  };
  spf: {
    present: boolean;
    valid: boolean;
    errors?: string[];
  };
}

export type IssueType =
  | 'dmarc-missing'
  | 'dmarc-invalid'
  | 'dkim-missing'
  | 'dkim-invalid'
  | 'spf-missing'
  | 'spf-invalid';

export const ISSUE_LABELS: Record<IssueType, string> = {
  'dmarc-missing': 'DMARC record not found',
  'dmarc-invalid': 'DMARC record is invalid',
  'dkim-missing': 'DKIM record not found',
  'dkim-invalid': 'DKIM record is invalid',
  'spf-missing': 'SPF record not found',
  'spf-invalid': 'SPF record is invalid',
};
