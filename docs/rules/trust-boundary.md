# Trust Boundary Policy for Non-DNS Probes

**Version:** 1.0  
**Effective Date:** 2026-03-17  
**Status:** Draft (pending security review)

## Purpose

This document defines the trust boundary for non-DNS probe operations in the DNS Ops Workbench. These probes go beyond simple DNS queries and involve active network connections to third-party systems.

## Principles

1. **Separate Execution Surface** - Non-DNS probes run in a completely separate runtime from production mail systems
2. **Allowlist Only** - Probe destinations are derived from DNS results, not arbitrary user input
3. **Read-Only** - All probes are read-only; no state changes on target systems
4. **Minimal Scope** - Probes are limited to the minimum required for operational validation
5. **Audit Everything** - All probe operations are logged and auditable

## Allowed Probe Types (Phase 1)

| Probe Type | Purpose | Risk Level |
|-----------|---------|------------|
| MTA-STS policy fetch | Validate mail security policy | Low |
| SMTP STARTTLS capability check | Verify TLS support on mail servers | Medium |

## Blocked Address Space

The following address ranges are **strictly prohibited** for probing:

### RFC 1918 Private Addresses
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

### Loopback
- `127.0.0.0/8`
- `::1/128`

### Link-Local
- `169.254.0.0/16`
- `fe80::/10`

### Multicast
- `224.0.0.0/4`
- `ff00::/8`

### Other Restricted
- `0.0.0.0/8` (Current network)
- `::/128` (Unspecified)

## Egress Restrictions

### IP Separation
- Non-DNS probes use **dedicated egress IPs**
- Separate from production mail server IPs
- Clearly identifiable in external logs

### Rate Limits
| Probe Type | Max Concurrent | Per-Target Rate |
|-----------|---------------|-----------------|
| MTA-STS fetch | 10 | 1 per 60 seconds |
| SMTP STARTTLS | 5 | 1 per 300 seconds |

### Timeout Limits
| Probe Type | Connect Timeout | Total Timeout |
|-----------|-----------------|---------------|
| MTA-STS fetch | 10 seconds | 30 seconds |
| SMTP STARTTLS | 15 seconds | 60 seconds |

## Probe Execution Flow

```
┌─────────────────┐
│  DNS Collection │
│   (Primary)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Extract Target │────▶│  Validate Target│
│  from DNS (MX)  │     │  against allow  │
└─────────────────┘     │  list & block   │
                        │  list           │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌──────────────┐         ┌──────────────┐
            │   ALLOWED    │         │   BLOCKED    │
            │  Execute in  │         │  Log + Skip  │
            │  probe worker│         │              │
            └──────────────┘         └──────────────┘
```

## Target Validation Rules

1. **Derived from DNS only** - Targets must be derived from MX records or other DNS data
2. **No arbitrary endpoints** - Users cannot specify custom probe targets
3. **Domain validation** - Target domains must match expected patterns
4. **IP validation** - Resolved IPs are checked against block lists

## Security Controls

### SSRF Prevention
- URL parsing with strict validation
- No redirects followed automatically
- Hostname validation against expected patterns
- IP resolution before connection

### Network Isolation
- Probe workers run in isolated network namespace
- Firewall rules block egress to internal networks
- Separate security groups / network policies

### Authentication
- Probe operations require explicit operator authorization
- Audit logging of who triggered what probe when
- No automated probes without explicit scheduling

## Monitoring and Alerting

### Metrics to Track
- Probe success/failure rates
- Timeout rates by probe type
- Blocked probe attempts
- Probe execution duration

### Alerts
- Unusual probe failure rates
- Attempts to probe blocked addresses
- Probe timeout spikes

## Emergency Procedures

### Probe Compromise
1. Immediately disable probe workers
2. Revoke probe egress IP reputation if needed
3. Review logs for unauthorized probing
4. Notify security team

### False Positive Blocking
1. Review block list rules
2. Add specific allowlist entry if justified
3. Document exception with security rationale

## Compliance Notes

- All probe operations comply with responsible disclosure
- No vulnerability scanning or exploitation
- Read-only operations only
- Respect for rate limits and terms of service

## Review Schedule

| Review Type | Frequency | Owner |
|-------------|-----------|-------|
| Policy review | Quarterly | Security Team |
| Block list audit | Monthly | Operations |
| Probe type assessment | Per release | Engineering |

## Related Documents

- [Query Scope](./query-scope.md) - DNS query limitations
- [Security Runbook](../security/probe-incident-response.md)
- [Infrastructure Diagram](../architecture/network-isolation.md)
