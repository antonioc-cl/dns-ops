/**
 * Mail Collection Job
 *
 * Collects mail-related DNS records (DMARC, DKIM, SPF) for a domain.
 * Persists DKIM selector provenance and mail evidence summary.
 */

import {
  createPostgresAdapter,
  DkimSelectorRepository,
  MailEvidenceRepository,
  type NewDkimSelector,
  type NewMailEvidence,
  type NewObservation,
  ObservationRepository,
} from '@dns-ops/db';
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
    let selectorCount = 0;
    if (snapshotId) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        return c.json({ error: 'DATABASE_URL not configured' }, 500);
      }
      const db = createPostgresAdapter(dbUrl);
      const observationRepo = new ObservationRepository(db);
      const selectorRepo = new DkimSelectorRepository(db);
      const mailEvidenceRepo = new MailEvidenceRepository(db);

      // Store observations
      observationCount = await storeMailObservations(
        observationRepo,
        snapshotId,
        normalizedDomain,
        result
      );

      // Store DKIM selectors with provenance
      selectorCount = await storeDkimSelectors(selectorRepo, snapshotId, normalizedDomain, result);

      // Store mail evidence summary
      await storeMailEvidence(mailEvidenceRepo, snapshotId, normalizedDomain, result);
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
        selectorCount,
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

/**
 * Store DKIM selectors with provenance tracking
 */
async function storeDkimSelectors(
  repo: DkimSelectorRepository,
  snapshotId: string,
  domain: string,
  result: MailCheckResult
): Promise<number> {
  const selectors: NewDkimSelector[] = [];

  // Map provenance from checker to DB enum
  // Checker uses: 'managed', 'heuristic', 'operator', 'provider', 'default'
  // DB uses: 'managed-zone-config', 'operator-supplied', 'provider-heuristic', 'common-dictionary', 'not-found'
  const mapProvenance = (
    provenance?: string
  ):
    | 'managed-zone-config'
    | 'operator-supplied'
    | 'provider-heuristic'
    | 'common-dictionary'
    | 'not-found' => {
    switch (provenance) {
      case 'managed':
        return 'managed-zone-config';
      case 'operator':
        return 'operator-supplied';
      case 'provider':
        return 'provider-heuristic';
      case 'dictionary':
      case 'default': // 'default' from checker means common dictionary was used
      case 'heuristic':
        return 'common-dictionary';
      default:
        return 'not-found';
    }
  };

  // Map confidence from provenance
  const mapConfidence = (
    provenance?: string
  ): 'certain' | 'high' | 'medium' | 'low' | 'heuristic' => {
    switch (provenance) {
      case 'managed':
        return 'certain';
      case 'operator':
        return 'high';
      case 'provider':
        return 'medium';
      case 'dictionary':
        return 'low';
      default:
        return 'heuristic';
    }
  };

  // Store the found selector
  if (result.dkim.selector) {
    selectors.push({
      snapshotId,
      selector: result.dkim.selector,
      domain,
      provenance: mapProvenance(result.dkim.selectorProvenance),
      confidence: mapConfidence(result.dkim.selectorProvenance),
      provider: result.dkim.provider as NewDkimSelector['provider'],
      found: result.dkim.present,
      recordData: result.dkim.record || undefined,
      isValid: result.dkim.valid,
      validationError: result.dkim.errors?.join(', ') || undefined,
    });
  }

  // Store tried selectors that were not found
  if (result.dkim.triedSelectors) {
    for (const tried of result.dkim.triedSelectors) {
      // Skip if already added (the found selector)
      if (tried === result.dkim.selector) continue;

      selectors.push({
        snapshotId,
        selector: tried,
        domain,
        provenance: 'common-dictionary', // Tried selectors are from dictionary
        confidence: 'low',
        provider: undefined,
        found: false,
      });
    }
  }

  if (selectors.length > 0) {
    await repo.createMany(selectors);
  }

  return selectors.length;
}

/**
 * Store mail evidence summary
 */
async function storeMailEvidence(
  repo: MailEvidenceRepository,
  snapshotId: string,
  domain: string,
  result: MailCheckResult
): Promise<void> {
  // Parse DMARC record for policy details
  let dmarcPolicy: string | undefined;
  let dmarcSubdomainPolicy: string | undefined;
  let dmarcPercent: string | undefined;
  const dmarcRua: string[] = [];
  const dmarcRuf: string[] = [];

  if (result.dmarc.record) {
    const record = result.dmarc.record;

    // Extract policy
    const pMatch = record.match(/\bp=([^;]+)/);
    if (pMatch) dmarcPolicy = pMatch[1].trim();

    // Extract subdomain policy
    const spMatch = record.match(/\bsp=([^;]+)/);
    if (spMatch) dmarcSubdomainPolicy = spMatch[1].trim();

    // Extract percent
    const pctMatch = record.match(/\bpct=(\d+)/);
    if (pctMatch) dmarcPercent = pctMatch[1];

    // Extract RUA
    const ruaMatch = record.match(/\brua=([^;]+)/);
    if (ruaMatch) {
      const uris = ruaMatch[1].split(',').map((u) => u.trim());
      dmarcRua.push(...uris);
    }

    // Extract RUF
    const rufMatch = record.match(/\bruf=([^;]+)/);
    if (rufMatch) {
      const uris = rufMatch[1].split(',').map((u) => u.trim());
      dmarcRuf.push(...uris);
    }
  }

  // Calculate security score
  let score = 0;
  const scoreBreakdown = {
    mx: 0,
    spf: 0,
    dmarc: 0,
    dkim: 0,
    mtaSts: 0,
    tlsRpt: 0,
    bimi: 0,
  };

  // MX: 15 points
  if (result.spf.present || result.dmarc.present || result.dkim.present) {
    // Assume MX exists if we have mail records
    scoreBreakdown.mx = 15;
    score += 15;
  }

  // SPF: 20 points
  if (result.spf.present && result.spf.valid) {
    scoreBreakdown.spf = 20;
    score += 20;
  } else if (result.spf.present) {
    scoreBreakdown.spf = 10;
    score += 10;
  }

  // DMARC: 25 points (full for reject, less for quarantine/none)
  if (result.dmarc.present && result.dmarc.valid) {
    if (dmarcPolicy === 'reject') {
      scoreBreakdown.dmarc = 25;
      score += 25;
    } else if (dmarcPolicy === 'quarantine') {
      scoreBreakdown.dmarc = 20;
      score += 20;
    } else {
      scoreBreakdown.dmarc = 10;
      score += 10;
    }
  }

  // DKIM: 20 points
  if (result.dkim.present && result.dkim.valid) {
    scoreBreakdown.dkim = 20;
    score += 20;
  } else if (result.dkim.present) {
    scoreBreakdown.dkim = 10;
    score += 10;
  }

  // MTA-STS, TLS-RPT, BIMI: Future enhancements
  // For now, these remain 0

  const evidence: NewMailEvidence = {
    snapshotId,
    domain,
    detectedProvider: result.dkim.provider as NewMailEvidence['detectedProvider'],
    providerConfidence: result.dkim.selectorProvenance === 'provider' ? 'medium' : 'heuristic',
    hasMx: true, // Assume true if we're checking mail
    isNullMx: false,
    hasSpf: result.spf.present,
    spfRecord: result.spf.record || undefined,
    hasDmarc: result.dmarc.present,
    dmarcRecord: result.dmarc.record || undefined,
    dmarcPolicy,
    dmarcSubdomainPolicy,
    dmarcPercent,
    dmarcRua: dmarcRua.length > 0 ? dmarcRua : undefined,
    dmarcRuf: dmarcRuf.length > 0 ? dmarcRuf : undefined,
    hasDkim: result.dkim.present,
    dkimSelectorsFound: result.dkim.selector ? [result.dkim.selector] : undefined,
    dkimSelectorCount: result.dkim.selector ? '1' : '0',
    hasMtaSts: false,
    hasTlsRpt: false,
    hasBimi: false,
    securityScore: String(score),
    scoreBreakdown,
  };

  await repo.upsert(evidence);
}
