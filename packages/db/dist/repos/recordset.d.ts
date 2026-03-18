import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { type RecordSet, type NewRecordSet } from '../schema';
import * as schema from '../schema';
type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export declare class RecordSetRepository {
    private db;
    constructor(db: DB);
    findById(id: string): Promise<RecordSet | null>;
    findBySnapshotId(snapshotId: string): Promise<RecordSet[]>;
    findByNameAndType(snapshotId: string, name: string, type: string): Promise<RecordSet | null>;
    create(data: NewRecordSet): Promise<RecordSet>;
    createMany(data: NewRecordSet[]): Promise<RecordSet[]>;
    update(id: string, data: Partial<NewRecordSet>): Promise<RecordSet>;
}
export {};
//# sourceMappingURL=recordset.d.ts.map