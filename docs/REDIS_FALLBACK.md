# Redis Fallback Behavior

## Overview

The DNS Ops Collector uses BullMQ for asynchronous job processing. Redis is required for BullMQ's queue infrastructure, but the system gracefully degrades to synchronous execution when Redis is unavailable.

## Configuration

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis connection URL (e.g., `redis://localhost:6379`) |
| `WORKER_ENABLED` | No | Set to `true` to start BullMQ workers |

### Redis URL Format

```bash
# Standard
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://user:password@localhost:6379

# With TLS
REDIS_URL=rediss://localhost:6379
```

## Fallback Behavior

### When Redis is Available (Normal Mode)

When `REDIS_URL` is set and valid:

1. **Job Queue Active**: All collection, monitoring, and report jobs are queued
2. **Async Processing**: Jobs processed by BullMQ workers asynchronously
3. **Job Persistence**: Failed jobs are retried (up to 3 attempts with exponential backoff)
4. **Job History**: Completed/failed job history retained (24h/7d)

### When Redis is Unavailable (Fallback Mode)

When `REDIS_URL` is not set or Redis is unreachable:

1. **Queue Disabled**: `getQueueHealth()` returns `{ available: false }`
2. **Synchronous Execution**: Jobs execute inline (no queue)
3. **No Retries**: Synchronous execution means no automatic retry
4. **No Job History**: Jobs complete or fail immediately

### Fallback Messages

```
[Queue] REDIS_URL not set - job queue disabled
[Queue] Collection queue not available - running synchronously
[Queue] Monitoring queue not available
```

## Impact by Feature

| Feature | With Redis | Without Redis |
|---------|------------|---------------|
| Domain Collection | Async, retried | Synchronous |
| Monitoring Refresh | Scheduled, async | Manual trigger only |
| Fleet Reports | Async, queued | Synchronous |
| Worker Processes | Active (if WORKER_ENABLED=true) | Not started |

## Health Check Behavior

### `/readyz` Endpoint

With Redis:
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok" },
    "queues": { "status": "ok" },
    "workers": { "status": "ok" }
  }
}
```

Without Redis:
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok" }
  }
}
```

Note: Queue and worker checks are omitted when Redis is unavailable.

## Development Setup

### Local Development (No Redis)

```bash
# Don't set REDIS_URL
# Everything runs synchronously
bun run dev
```

### Production Setup

```bash
# Set Redis URL
export REDIS_URL=redis://redis.internal:6379
export WORKER_ENABLED=true

# Start collector
bun run start
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  collector:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - WORKER_ENABLED=true
    depends_on:
      - redis
```

## Monitoring

### Queue Metrics (With Redis)

The `/readyz` endpoint exposes queue metrics:

```json
{
  "checks": {
    "queues": {
      "status": "ok",
      "details": {
        "COLLECTION": { "waiting": 2, "active": 1, "completed": 150, "failed": 3 },
        "MONITORING": { "waiting": 5, "active": 0, "completed": 500, "failed": 1 },
        "REPORTS": { "waiting": 1, "active": 0, "completed": 50, "failed": 0 }
      }
    }
  }
}
```

### Logging

Queue operations are logged:

```
[Queue] Collection queue not available - running synchronously
[Queue] Monitoring job scheduled: monitor:example.com
[Queue] Redis connection error: Connection refused
```

## Troubleshooting

### Redis Connection Issues

1. **Check Redis is running**: `redis-cli ping`
2. **Verify URL format**: Ensure `redis://` prefix
3. **Check network access**: Ensure collector can reach Redis host
4. **Check authentication**: If Redis requires password, include in URL

### Worker Issues

1. **Workers not starting**: Set `WORKER_ENABLED=true`
2. **Workers crashing**: Check logs for queue connection errors
3. **Jobs not processing**: Verify workers have Redis access

### Fallback Mode Detection

```bash
# Check if queue is available
curl http://localhost:3001/readyz | jq '.checks.queues'

# If unavailable:
# { "status": "error", "message": "Queue connection unavailable" }
```

## Migration Guide

### Moving from Fallback to Redis

1. Set `REDIS_URL` environment variable
2. Restart collector service
3. Queue becomes available immediately
4. New jobs queue instead of executing synchronously
5. Historical jobs in fallback mode are lost (not tracked)

### Moving from Redis to Fallback

1. Unset `WORKER_ENABLED` (stop workers first)
2. Wait for queue to drain or set `REDIS_URL` to empty
3. Restart collector
4. Jobs execute synchronously immediately
5. Pending queue jobs are preserved in Redis (if connection restored)

## Best Practices

1. **Development**: Use fallback mode (no Redis needed)
2. **Staging/Production**: Always use Redis for reliability
3. **Monitoring**: Watch `/readyz` for queue availability
4. **Testing**: Unit tests work without Redis; integration tests may need it
