import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { type Observation, type NewObservation } from '../schema';
import * as schema from '../schema';
type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export declare class ObservationRepository {
    private db;
    constructor(db: DB);
    findById(id: string): Promise<Observation | null>;
    findBySnapshotId(snapshotId: string): Promise<Observation[]>;
    findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]>;
    create(data: NewObservation): Promise<Observation>;
    createMany(data: NewObservation[]): Promise<Observation[]>;
}
export {};
//# sourceMappingURL=observation.d.ts.map