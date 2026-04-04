/**
 * Counting Semaphore — probe concurrency control
 *
 * Limits the number of concurrent outbound probe connections across all
 * requests. Without a global semaphore, each HTTP request to /api/probe/*
 * can spawn independent probe tasks; with N concurrent requests all making
 * C probes each the actual concurrency is N×C, not the configured limit.
 *
 * Usage:
 *   const sem = new Semaphore(5);
 *   const result = await sem.run(() => probeSMTPStarttls(host, tenant));
 *
 * Security review: docs/security/probe-sandbox-review.md
 */

export class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new Error(`Semaphore: permits must be a positive integer, got ${permits}`);
    }
    this.permits = permits;
  }

  /**
   * Acquire one permit. Resolves immediately when a permit is available,
   * otherwise queues the caller until one is released.
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release one permit. Wakes the next queued waiter, or increments the
   * available count if the queue is empty.
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      // Hand the permit directly to the waiter — do NOT increment permits
      next();
    } else {
      this.permits++;
    }
  }

  /**
   * Run an async function under the semaphore.
   * Acquires before calling fn, releases in the finally block.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /** Number of currently available permits (not waiting). */
  get available(): number {
    return this.permits;
  }

  /** Number of waiters queued behind the semaphore. */
  get queued(): number {
    return this.queue.length;
  }
}

/**
 * Module-level probe semaphore singleton.
 *
 * Initialised by probe-routes.ts calling initProbeSemaphore(concurrency)
 * on startup. In tests, call resetProbeSemaphore(n) to set a known limit.
 */
let _probeSemaphore: Semaphore | null = null;

/** Default concurrency used when the semaphore is not yet initialised. */
const DEFAULT_CONCURRENCY = 5;

/**
 * Get (or lazily create with DEFAULT_CONCURRENCY) the global probe semaphore.
 */
export function getProbeSemaphore(): Semaphore {
  if (!_probeSemaphore) {
    _probeSemaphore = new Semaphore(DEFAULT_CONCURRENCY);
  }
  return _probeSemaphore;
}

/**
 * Initialise the global probe semaphore with a specific permit count.
 * Call once at startup from probe-routes.ts after reading env config.
 */
export function initProbeSemaphore(permits: number): Semaphore {
  _probeSemaphore = new Semaphore(permits);
  return _probeSemaphore;
}

/**
 * Replace the global probe semaphore with a new instance.
 * Use in tests to control concurrency independently of process.env.
 * Passing no argument resets to the default (5) permit count.
 */
export function resetProbeSemaphore(permits: number = DEFAULT_CONCURRENCY): Semaphore {
  _probeSemaphore = new Semaphore(permits);
  return _probeSemaphore;
}
