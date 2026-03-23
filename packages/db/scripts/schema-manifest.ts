import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_SCHEMA_PATH = join(__dirname, '../dist/schema/index.js');

const TABLE_NAME_SYMBOL = 'Symbol(drizzle:Name)';
const TABLE_MARKER_SYMBOL = 'Symbol(drizzle:IsDrizzleTable)';
const ENUM_MARKER_SYMBOL = 'Symbol(drizzle:isPgEnum)';

export interface SchemaManifest {
  tables: string[];
  enums: string[];
}

function getSymbolByString(target: object | Function, symbolName: string): symbol | undefined {
  return Object.getOwnPropertySymbols(target).find((symbol) => String(symbol) === symbolName);
}

function getTableName(value: object): string | null {
  const tableMarker = getSymbolByString(value, TABLE_MARKER_SYMBOL);
  const tableName = getSymbolByString(value, TABLE_NAME_SYMBOL);

  if (!tableMarker || !tableName || !(value as Record<symbol, unknown>)[tableMarker]) {
    return null;
  }

  const name = (value as Record<symbol, unknown>)[tableName];
  return typeof name === 'string' ? name : null;
}

function getEnumName(value: Function): string | null {
  const enumMarker = getSymbolByString(value, ENUM_MARKER_SYMBOL);
  if (!enumMarker || !(value as unknown as Record<symbol, unknown>)[enumMarker]) {
    return null;
  }

  return typeof (value as unknown as { enumName?: unknown }).enumName === 'string'
    ? ((value as unknown as { enumName: string }).enumName)
    : null;
}

export function ensureCompiledSchemaExists(): boolean {
  return existsSync(DIST_SCHEMA_PATH);
}

export async function loadSchemaManifest(): Promise<SchemaManifest> {
  if (!ensureCompiledSchemaExists()) {
    throw new Error(`Compiled schema not found at ${DIST_SCHEMA_PATH}. Run \"bun run build\" first.`);
  }

  const schemaModule = (await import(pathToFileURL(DIST_SCHEMA_PATH).href)) as Record<string, unknown>;
  const tables = new Set<string>();
  const enums = new Set<string>();

  for (const value of Object.values(schemaModule)) {
    if (!value) continue;

    if (typeof value === 'object') {
      const tableName = getTableName(value);
      if (tableName) {
        tables.add(tableName);
      }
      continue;
    }

    if (typeof value === 'function') {
      const enumName = getEnumName(value);
      if (enumName) {
        enums.add(enumName);
      }
    }
  }

  return {
    tables: [...tables].sort(),
    enums: [...enums].sort(),
  };
}
