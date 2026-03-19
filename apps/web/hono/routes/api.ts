import { Hono } from 'hono'
import type { Env } from '../types.js'
import { findingsRoutes } from './findings.js'
import { legacyToolsRoutes } from './legacy-tools.js'
import { selectorRoutes } from './selectors.js'
import { delegationRoutes } from './delegation.js'
import { mailRoutes } from './mail.js'
import { shadowComparisonRoutes } from './shadow-comparison.js'
import { providerTemplateRoutes } from './provider-templates.js'
import { snapshotRoutes } from './snapshots.js'
import { portfolioRoutes } from './portfolio.js'

export const apiRoutes = new Hono<Env>()

// Mount findings routes
apiRoutes.route('/', findingsRoutes)

// Mount legacy tools routes
apiRoutes.route('/', legacyToolsRoutes)

// Mount selector routes
apiRoutes.route('/', selectorRoutes)

// Mount delegation routes
apiRoutes.route('/', delegationRoutes)

// Mount mail routes
apiRoutes.route('/', mailRoutes)

// Mount shadow comparison routes (Bead 09)
apiRoutes.route('/', shadowComparisonRoutes)

// Mount provider template routes (Bead 09)
apiRoutes.route('/', providerTemplateRoutes)

// Mount snapshot routes (Bead 13)
apiRoutes.route('/snapshots', snapshotRoutes)

// Mount portfolio routes (Bead 14)
apiRoutes.route('/portfolio', portfolioRoutes)

// Get latest snapshot for a domain
apiRoutes.get('/domain/:domain/latest', async (c) => {
  const domain = c.req.param('domain')
  const db = c.get('db').getDrizzle()

  try {
    const domainRecord = await db.query.domains.findFirst({
      where: (domains, { eq }) => eq(domains.normalizedName, domain),
    })

    if (!domainRecord) {
      return c.json({ error: 'Domain not found' }, 404)
    }

    const snapshot = await db.query.snapshots.findFirst({
      where: (snapshots, { eq }) => eq(snapshots.domainId, domainRecord.id),
      orderBy: (snapshots, { desc }) => [desc(snapshots.createdAt)],
    })

    if (!snapshot) {
      return c.json({ error: 'No snapshots found' }, 404)
    }

    return c.json(snapshot)
  } catch (error) {
    console.error('Error fetching snapshot:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get observations for a snapshot
apiRoutes.get('/snapshot/:snapshotId/observations', async (c) => {
  const snapshotId = c.req.param('snapshotId')
  const db = c.get('db').getDrizzle()

  try {
    const observations = await db.query.observations.findMany({
      where: (observations, { eq }) => eq(observations.snapshotId, snapshotId),
      orderBy: (observations, { asc }) => [asc(observations.queryName), asc(observations.queryType)],
    })

    return c.json(observations)
  } catch (error) {
    console.error('Error fetching observations:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get record sets for a snapshot
apiRoutes.get('/snapshot/:snapshotId/recordsets', async (c) => {
  const snapshotId = c.req.param('snapshotId')
  const db = c.get('db').getDrizzle()

  try {
    const recordSets = await db.query.recordSets.findMany({
      where: (recordSets, { eq }) => eq(recordSets.snapshotId, snapshotId),
      orderBy: (recordSets, { asc }) => [asc(recordSets.type), asc(recordSets.name)],
    })

    return c.json(recordSets)
  } catch (error) {
    console.error('Error fetching record sets:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Trigger collection (proxies to collector service)
apiRoutes.post('/collect/domain', async (c) => {
  let body: { domain?: string; zoneManagement?: string };
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON in request body' }, 400)
  }
  const { domain, zoneManagement = 'unmanaged' } = body

  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400)
  }

  const collectorUrl = process.env.COLLECTOR_URL || 'http://localhost:3001'

  try {
    const response = await fetch(`${collectorUrl}/api/collect/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        zoneManagement,
        triggeredBy: 'web-ui',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return c.json({ error: `Collector error: ${error}` }, 502)
    }

    const result = await response.json()
    return c.json(result)
  } catch (error) {
    console.error('Error triggering collection:', error)
    return c.json({ error: 'Failed to connect to collector service' }, 503)
  }
})

// Health check
apiRoutes.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'dns-ops-web',
    timestamp: new Date().toISOString(),
  })
})
