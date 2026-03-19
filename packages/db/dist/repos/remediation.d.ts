/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type RemediationRequest, type NewRemediationRequest } from '../schema/remediation.js';
export declare class RemediationRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Create a new remediation request
     */
    create(data: NewRemediationRequest): Promise<RemediationRequest>;
    /**
     * Find remediation request by ID
     */
    findById(id: string): Promise<RemediationRequest | null>;
    /**
     * Find all remediation requests for a domain
     */
    findByDomain(domain: string): Promise<RemediationRequest[]>;
    /**
     * Find remediation requests by snapshot ID
     */
    findBySnapshotId(snapshotId: string): Promise<RemediationRequest[]>;
    /**
     * Find remediation requests by status
     */
    findByStatus(status: RemediationRequest['status'], limit?: number): Promise<RemediationRequest[]>;
    /**
     * Update remediation request status
     */
    updateStatus(id: string, status: RemediationRequest['status'], assignedTo?: string): Promise<RemediationRequest | null>;
    /**
     * Close a remediation request
     */
    close(id: string, reason?: string): Promise<RemediationRequest | null>;
    /**
     * List remediation requests with filtering
     */
    list(options?: {
        domains?: string[];
        statuses?: RemediationRequest['status'][];
        priorities?: RemediationRequest['priority'][];
        limit?: number;
        offset?: number;
    }): Promise<RemediationRequest[]>;
    /**
     * Count remediation requests by status
     */
    countByStatus(): Promise<Record<RemediationRequest['status'], number>>;
}
//# sourceMappingURL=remediation.d.ts.map