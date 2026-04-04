/**
 * Error Reporter Tests
 *
 * Tests for the createErrorReporter factory and reporter implementations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CompositeErrorReporter,
  ConsoleErrorReporter,
  createErrorReporter,
  HttpErrorReporter,
} from './error-reporting.js';

describe('ConsoleErrorReporter', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => consoleSpy.mockClear());

  it('reports error to console.error', () => {
    const reporter = new ConsoleErrorReporter();
    const error = new Error('test error');
    reporter.report(error, { requestId: 'req-1' });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorReporter]',
      'test error',
      expect.objectContaining({ requestId: 'req-1' })
    );
  });
});

describe('HttpErrorReporter', () => {
  const mockFetch = vi.fn();
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    consoleSpy.mockClear();
    mockFetch.mockClear();
    vi.unstubAllGlobals();
  });

  it('posts error to endpoint and logs to console', async () => {
    const reporter = new HttpErrorReporter('https://errors.example.com/report');
    await reporter.report(new Error('test'), { domain: 'example.com' });

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://errors.example.com/report',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('does not throw on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const reporter = new HttpErrorReporter('https://errors.example.com/report');

    await expect(reporter.report(new Error('test'))).resolves.not.toThrow();
  });
});

describe('CompositeErrorReporter', () => {
  it('delegates to all reporters', async () => {
    const r1 = { report: vi.fn() };
    const r2 = { report: vi.fn() };
    const composite = new CompositeErrorReporter([r1, r2]);

    const err = new Error('composite test');
    await composite.report(err, { a: 1 });

    expect(r1.report).toHaveBeenCalledWith(err, { a: 1 });
    expect(r2.report).toHaveBeenCalledWith(err, { a: 1 });
  });

  it('does not fail if one reporter throws', async () => {
    const r1 = { report: vi.fn().mockRejectedValue(new Error('fail')) };
    const r2 = { report: vi.fn() };
    const composite = new CompositeErrorReporter([r1, r2]);

    await expect(composite.report(new Error('test'))).resolves.not.toThrow();
    expect(r2.report).toHaveBeenCalled();
  });
});

describe('createErrorReporter', () => {
  it('returns ConsoleErrorReporter by default', () => {
    const reporter = createErrorReporter();
    expect(reporter).toBeInstanceOf(ConsoleErrorReporter);
  });

  it('returns ConsoleErrorReporter when consoleOnly is true', () => {
    const reporter = createErrorReporter({ consoleOnly: true });
    expect(reporter).toBeInstanceOf(ConsoleErrorReporter);
  });

  it('returns CompositeErrorReporter when custom is provided', () => {
    const custom = { report: vi.fn() };
    const reporter = createErrorReporter({ custom });
    expect(reporter).toBeInstanceOf(CompositeErrorReporter);
  });

  it('returns HttpErrorReporter when ERROR_REPORTING_ENDPOINT is set', () => {
    const original = process.env.ERROR_REPORTING_ENDPOINT;
    process.env.ERROR_REPORTING_ENDPOINT = 'https://errors.example.com/report';

    try {
      const reporter = createErrorReporter();
      expect(reporter).toBeInstanceOf(HttpErrorReporter);
    } finally {
      if (original !== undefined) {
        process.env.ERROR_REPORTING_ENDPOINT = original;
      } else {
        delete process.env.ERROR_REPORTING_ENDPOINT;
      }
    }
  });
});
