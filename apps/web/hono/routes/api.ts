import { Hono } from 'hono'
import type { Env } from '../types'

export const apiRoutes = new Hono<Env>()

// Get latest snapshot for a domain
apiRoutes.get('/domain/:domain/latest', async (c) => {
  const domain = c.req.param('domain')
  const db = c.get('db')
  
  try {
    // Find domain
    const domainRecord = await db.query.domains.findFirst({
      where: (domains, { eq }) => eq(domains.normalizedName, domain),
    })
    
    if (!domainRecord) {
      return c.json({ error: 'Domain not found' }, 404)
    }
    
    // Get latest snapshot
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

// Trigger collection (proxies to collector service)
apiRoutes.post('/collect/domain', async (c) => {
  const body = await c.req.json()
  const { domain, zoneManagement = 'unmanaged' } = body
  
  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400)
  }
  
  // Forward to collector service
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
