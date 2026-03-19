/**
 * DNS Collection Types
 */
export interface CollectionConfig {
    domain: string;
    zoneManagement: 'managed' | 'unmanaged' | 'unknown';
    recordTypes: string[];
    triggeredBy: string;
    queryNames?: string[];
    includeMailRecords?: boolean;
    dkimSelectors?: string[];
    managedDkimSelectors?: string[];
    includeDelegationData?: boolean;
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
    identifier: string;
    region?: string;
}
export interface DNSFlags {
    aa: boolean;
    tc: boolean;
    rd: boolean;
    ra: boolean;
    ad: boolean;
    cd: boolean;
}
export interface DNSAnswer {
    name: string;
    type: string;
    ttl: number;
    data: string;
}
//# sourceMappingURL=types.d.ts.map