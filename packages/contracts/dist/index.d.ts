export * from './enums';
export interface Domain {
    id: string;
    name: string;
    normalizedName: string;
    punycodeName?: string;
    zoneManagement: import('./enums').ZoneManagement;
    createdAt: Date;
    updatedAt: Date;
}
export interface Snapshot {
    id: string;
    domainId: string;
    domainName: string;
    resultState: import('./enums').ResultState;
    scope: SnapshotScope;
    rulesetVersion: string;
    createdAt: Date;
    createdBy: string;
}
export interface SnapshotScope {
    queriedNames: string[];
    queriedTypes: import('./enums').SupportedRecordType[];
    vantages: import('./enums').VantageType[];
    zoneManagement: import('./enums').ZoneManagement;
}
export interface Observation {
    id: string;
    snapshotId: string;
    queryName: string;
    queryType: string;
    vantage: import('./enums').VantageType;
    status: import('./enums').CollectionStatus;
    timestamp: Date;
    responseCode?: number;
    ttl?: number;
    answers: DNSAnswer[];
    authority: DNSAnswer[];
    additional: DNSAnswer[];
    errorMessage?: string;
}
export interface DNSAnswer {
    name: string;
    type: string;
    ttl: number;
    data: string;
}
export interface RecordSet {
    id: string;
    snapshotId: string;
    name: string;
    type: string;
    ttl: number;
    values: string[];
    sourceVantages: import('./enums').VantageType[];
}
export interface Finding {
    id: string;
    snapshotId: string;
    type: string;
    title: string;
    description: string;
    severity: import('./enums').Severity;
    confidence: import('./enums').Confidence;
    riskPosture: import('./enums').RiskPosture;
    blastRadius: import('./enums').BlastRadius;
    reviewOnly: boolean;
    evidence: EvidenceLink[];
    createdAt: Date;
}
export interface EvidenceLink {
    observationId: string;
    recordSetId?: string;
    description: string;
}
export interface Suggestion {
    id: string;
    findingId: string;
    title: string;
    description: string;
    action: string;
    riskPosture: import('./enums').RiskPosture;
    blastRadius: import('./enums').BlastRadius;
    reviewOnly: boolean;
}
export interface RulesetVersion {
    id: string;
    version: string;
    name: string;
    description: string;
    createdAt: Date;
    active: boolean;
}
//# sourceMappingURL=index.d.ts.map