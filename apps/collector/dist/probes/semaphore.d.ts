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
export declare class Semaphore {
    private permits;
    private readonly queue;
    constructor(permits: number);
    /**
     * Acquire one permit. Resolves immediately when a permit is available,
     * otherwise queues the caller until one is released.
     */
    acquire(): Promise<void>;
    /**
     * Release one permit. Wakes the next queued waiter, or increments the
     * available count if the queue is empty.
     */
    release(): void;
    /**
     * Run an async function under the semaphore.
     * Acquires before calling fn, releases in the finally block.
     */
    run<T>(fn: () => Promise<T>): Promise<T>;
    /** Number of currently available permits (not waiting). */
    get available(): number;
    /** Number of waiters queued behind the semaphore. */
    get queued(): number;
}
/**
 * Get (or lazily create with DEFAULT_CONCURRENCY) the global probe semaphore.
 */
export declare function getProbeSemaphore(): Semaphore;
/**
 * Initialise the global probe semaphore with a specific permit count.
 * Call once at startup from probe-routes.ts after reading env config.
 */
export declare function initProbeSemaphore(permits: number): Semaphore;
/**
 * Replace the global probe semaphore with a new instance.
 * Use in tests to control concurrency independently of process.env.
 * Passing no argument resets to the default (5) permit count.
 */
export declare function resetProbeSemaphore(permits?: number): Semaphore;
//# sourceMappingURL=semaphore.d.ts.map