import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewObservation, type Observation } from '../schema/index.js';
export declare class ObservationRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findById(id: string): Promise<Observation | null>;
    findBySnapshotId(snapshotId: string): Promise<Observation[]>;
    findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]>;
    create(data: NewObservation): Promise<Observation>;
    createMany(data: NewObservation[]): Promise<Observation[]>;
}
//# sourceMappingURL=observation.d.ts.map