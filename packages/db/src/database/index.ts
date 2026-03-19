/**
 * Database Module
 *
 * Clean database abstraction that works with both PostgreSQL and D1.
 */

export {
  SimpleDatabaseAdapter,
  createSimpleAdapter,
  type IDatabaseAdapter,
} from './simple-adapter.js';
