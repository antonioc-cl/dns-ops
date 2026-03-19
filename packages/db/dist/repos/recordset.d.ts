import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type RecordSet, type NewRecordSet } from '../schema/index.js';
export declare class RecordSetRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findById(id: string): Promise<RecordSet | null>;
    findBySnapshotId(snapshotId: string): Promise<RecordSet[]>;
    findByNameAndType(snapshotId: string, name: string, type: string): Promise<RecordSet | null>;
    create(data: NewRecordSet): Promise<RecordSet>;
    createMany(data: NewRecordSet[]): Promise<RecordSet[]>;
    update(id: string, data: Partial<NewRecordSet>): Promise<RecordSet | undefined>;
}
//# sourceMappingURL=recordset.d.ts.map