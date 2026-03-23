/**
 * Shared mock DB adapter for route-level tests.
 *
 * Provides a Drizzle-compatible in-memory DB that resolves table names
 * via Drizzle's internal `Symbol(drizzle:Name)` convention and extracts
 * condition parameters from SQL `Param` chunks.
 *
 * Usage:
 * ```ts
 * import { createMockDb, getTableName, getConditionParam } from '@dns-ops/testkit/mock-db';
 * const db = createMockDb({ snapshots: [...], recordSets: [...] });
 * ```
 */

import type { IDatabaseAdapter } from '@dns-ops/db';

// =============================================================================
// DRIZZLE INTROSPECTION HELPERS
// =============================================================================

/**
 * Extract the Drizzle table name from a table reference object.
 * Works with both `Symbol.for('drizzle:Name')` and local Symbol variants.
 */
export function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const record = table as Record<symbol | string, unknown>;
  const symbolName = Symbol.for('drizzle:Name');
  if (typeof record[symbolName] === 'string') {
    return record[symbolName] as string;
  }
  const symbols = Object.getOwnPropertySymbols(record);
  const drizzleName = symbols.find((s) => String(s) === 'Symbol(drizzle:Name)');
  if (drizzleName && typeof record[drizzleName] === 'string') {
    return record[drizzleName] as string;
  }
  return '';
}

/**
 * Extract the first `Param` value from a Drizzle SQL condition object.
 */
export function getConditionParam(condition: unknown): unknown {
  const sql = condition as {
    queryChunks?: Array<{ constructor?: { name?: string }; value?: unknown }>;
  };
  return sql.queryChunks?.find((c) => c?.constructor?.name === 'Param')?.value;
}

// =============================================================================
// GENERIC MOCK DB
// =============================================================================

type RowData = Record<string, unknown>;

export interface MockDbState {
  [tableName: string]: RowData[];
}

/**
 * Create a generic mock IDatabaseAdapter backed by the given state object.
 *
 * The state keys are table names (matching Drizzle `Symbol(drizzle:Name)`).
 * `select` returns all rows for a table; `selectWhere`/`selectOne` filter by
 * matching any row value against the extracted condition param.
 *
 * Returns an object duck-typed as IDatabaseAdapter. Since the real adapter
 * is a class (SimpleDatabaseAdapter), callers should cast via `as unknown as IDatabaseAdapter`
 * or use this directly where the type is accepted.
 */
export function createMockDb(state: MockDbState): IDatabaseAdapter {
  const rows = (name: string): RowData[] => state[name] ?? [];

  return {
    type: 'postgres' as const,
    db: undefined,
    getDrizzle: () => undefined,
    select: async (table: unknown) => [...rows(getTableName(table))],
    selectWhere: async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      return rows(name).filter((r) => Object.values(r).some((v) => v === param));
    },
    selectOne: async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      return rows(name).find((r) => Object.values(r).some((v) => v === param));
    },
    insert: async (_table: unknown, values: RowData) => ({
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
      ...values,
    }),
    insertMany: async () => [],
    update: async () => [],
    updateOne: async () => undefined,
    delete: async () => 0,
    transaction: async <T>(callback: (adapter: IDatabaseAdapter) => Promise<T>) =>
      callback(createMockDb(state)),
  } as unknown as IDatabaseAdapter;
}
