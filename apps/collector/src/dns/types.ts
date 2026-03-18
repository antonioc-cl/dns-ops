/**
 * DNS Collection Types
 */

export interface CollectionConfig {
  domain: string;
  zoneManagement: 'managed' | 'unmanaged' | 'unknown';
  recordTypes: string[];
  triggeredBy: string;
  // Optional: specific names to query (for targeted inspection)
  queryNames?: string[];
  // Mail collection options (Bead 08)
  includeMailRecords?: boolean;
  dkimSelectors?: string[];
  managedDkimSelectors?: string[];
}

export interface CollectionResult {
  snapshotId: string;
  domain: string;
  resultState: 'complete' | 'partial' | 'failed';
  observationCount: number;
  duration: number;
  errors: CollectionError[];
}

export interface CollectionError {
  queryName: string;
  queryType: string;
  vantage: string;
  error: string;
}

export interface DNSQuery {
  name: string;
  type: string;
}

export interface DNSQueryResult {
  query: DNSQuery;
  vantage: VantageInfo;
  success: boolean;
  responseCode?: number;
  flags?: DNSFlags;
  answers: DNSAnswer[];
  authority: DNSAnswer[];
  additional: DNSAnswer[];
  responseTime: number;
  error?: string;
}

export interface VantageInfo {
  type: 'public-recursive' | 'authoritative';
  identifier: string; // e.g., '8.8.8.8' or 'ns1.example.com'
  region?: string;
}

export interface DNSFlags {
  aa: boolean; // Authoritative answer
  tc: boolean; // Truncated
  rd: boolean; // Recursion desired
  ra: boolean; // Recursion available
  ad: boolean; // Authentic data (DNSSEC)
  cd: boolean; // Checking disabled
}

export interface DNSAnswer {
  name: string;
  type: string;
  ttl: number;
  data: string;
}
