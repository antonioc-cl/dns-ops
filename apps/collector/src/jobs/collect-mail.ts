/**
 * Mail Collection Job
 *
 * Collects mail-related DNS records (DMARC, DKIM, SPF) for a domain.
 */

import { createPostgresAdapter, type NewObservation, ObservationRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import { type MailCheckResult, performMailCheck } from '../mail/checker.js';

export const collectMailRoutes = new Hono();

/**
 * POST /api/collect/mail
 * Trigger mail record collection for a domain
 */
collectMailRoutes.post('/mail', async (c) => {
  try {
    const body = await c.req.json();
    const { domain, snapshotId, preferredProvider, explicitSelectors } = body;

    if (!domain || typeof domain !== 'string') {
      return c.json({ error: 'Domain is required' }, 400);
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');

    // Validate domain format
    if (!isValidDomain(normalizedDomain)) {
      return c.json({ error: 'Invalid domain format' }, 400);
    }

    // Perform mail check
    const startTime = Date.now();
    const result = await performMailCheck(normalizedDomain, {
      preferredProvider,
      explicitSelectors,
    });
    const duration = Date.now() - startTime;

    // Store results if snapshotId provided
    let observationCount = 0;
    if (snapshotId) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return c.json({ error: 'DATABASE_URL not configured' }, 500);
      }
      const db = createPostgresAdapter(dbUrl);
      const observationRepo = new ObservationRepository(db);

      observationCount = await storeMailObservations(
        observationRepo,
        snapshotId,
        normalizedDomain,
        result
      );
    }

    return c.json(
      {
        success: true,
        domain: normalizedDomain,
        snapshotId: snapshotId || null,
        duration,
        results: {
          dmarc: {
            present: result.dmarc.present,
            valid: result.dmarc.valid,
            errors: result.dmarc.errors,
          },
          dkim: {
            present: result.dkim.present,
            valid: result.dkim.valid,
            selector: result.dkim.selector,
            selectorProvenance: result.dkim.selectorProvenance,
            triedSelectors: result.dkim.triedSelectors,
            errors: result.dkim.errors,
          },
          spf: {
            present: result.spf.present,
            valid: result.spf.valid,
            errors: result.spf.errors,
          },
        },
        observationCount,
      },
      200
    );
  } catch (error) {
    console.error('Mail collection error:', error);
    return c.json(
      {
        error: 'Mail collection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Store mail check results as observations
 */
async function storeMailObservations(
  repo: ObservationRepository,
  snapshotId: string,
  domain: string,
  result: MailCheckResult
): Promise<number> {
  const observations: NewObservation[] = [];
  const now = new Date();

  // DMARC observation
  observations.push({
    snapshotId,
    queryName: `_dmarc.${domain}`,
    queryType: 'TXT',
    vantageType: 'public-recursive',
    status: result.dmarc.present
      ? 'success'
      : result.dmarc.errors?.[0]?.includes('NXDOMAIN')
        ? 'nxdomain'
        : 'error',
    queriedAt: now,
    responseTimeMs: 0, // Would need actual timing
    answerSection: result.dmarc.record
      ? [
          {
            name: `_dmarc.${domain}`,
            type: 'TXT',
            ttl: 3600,
            data: result.dmarc.record,
          },
        ]
      : undefined,
    errorMessage: result.dmarc.errors?.join(', ') || undefined,
  });

  // DKIM observation
  const dkimName = result.dkim.selector
    ? `${result.dkim.selector}._domainkey.${domain}`
    : `unknown._domainkey.${domain}`;

  observations.push({
    snapshotId,
    queryName: dkimName,
    queryType: 'TXT',
    vantageType: 'public-recursive',
    status: result.dkim.present
      ? 'success'
      : result.dkim.errors?.[0]?.includes('NXDOMAIN')
        ? 'nxdomain'
        : 'error',
    queriedAt: now,
    responseTimeMs: 0,
    answerSection: result.dkim.record
      ? [
          {
            name: dkimName,
            type: 'TXT',
            ttl: 3600,
            data: result.dkim.record,
          },
        ]
      : undefined,
    errorMessage: result.dkim.errors?.join(', ') || undefined,
  });

  // SPF observation (queried on apex domain)
  observations.push({
    snapshotId,
    queryName: domain,
    queryType: 'TXT',
    vantageType: 'public-recursive',
    status: result.spf.present ? 'success' : 'success', // SPF is optional in terms of DNS resolution
    queriedAt: now,
    responseTimeMs: 0,
    answerSection: result.spf.record
      ? [
          {
            name: domain,
            type: 'TXT',
            ttl: 3600,
            data: result.spf.record,
          },
        ]
      : undefined,
    errorMessage: result.spf.errors?.join(', ') || undefined,
  });

  // Insert observations
  await repo.createMany(observations);

  return observations.length;
}

function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;

  const labelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  const labels = domain.split('.');

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!labelRegex.test(label)) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
  }

  return true;
}
