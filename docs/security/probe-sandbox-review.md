# Probe Sandbox Security Review

**Document Version:** 1.0.0  
**Date:** 2024-03-24  
**Status:** Complete

## Executive Summary

The probe sandbox feature enables active DNS probing (MTA-STS, SMTP STARTTLS) for enhanced mail security assessment. This document reviews the security controls, identifies gaps, and provides recommendations.

## Threat Model

### In-Scope Threats

| Threat | Severity | Mitigation | Status |
|--------|-----------|------------|--------|
| SSRF - Private Network Access | Critical | SSRF guard + Allowlist | ✅ Mitigated |
| SSRF - Metadata Service Access | Critical | RFC 1918/loopback blocklist | ✅ Mitigated |
| DNS Rebinding | High | DNS validation at resolution time | ✅ Mitigated |
| Redirect to Private | High | URL validation on redirects | ✅ Mitigated |
| Rate Limiting | Medium | Configurable concurrency | ✅ Implemented |
| Timeout Enforcement | Medium | Configurable timeout | ✅ Implemented |
| Allowlist Exhaustion | Low | TTL-based expiry | ✅ Implemented |

### Out-of-Scope

- DDoS of probe targets (network-level protection)
- Probe result poisoning (read-only observation)

## SSRF Attack Surface Analysis

### Private Network Ranges Blocked

| Range | Description | Coverage |
|-------|-------------|----------|
| `10.0.0.0/8` | RFC 1918 private | ✅ |
| `172.16.0.0/12` | RFC 1918 private | ✅ |
| `192.168.0.0/16` | RFC 1918 private | ✅ |
| `127.0.0.0/8` | Loopback | ✅ |
| `169.254.0.0/16` | Link-local | ✅ |
| `0.0.0.0/8` | This network | ✅ |
| `224.0.0.0/4` | Multicast | ✅ |
| `240.0.0.0/4` | Reserved | ✅ |
| `::1/128` | IPv6 loopback | ✅ |
| `fe80::/10` | IPv6 link-local | ✅ |
| `fc00::/7` | Unique local | ✅ |
| `ff00::/8` | IPv6 multicast | ✅ |

### Cloud Metadata Protection

| Provider | Endpoint | Status |
|----------|-----------|--------|
| AWS | 169.254.169.254 | ✅ Blocked (link-local) |
| GCP | 169.254.169.254 | ✅ Blocked (link-local) |
| Azure | 169.254.169.254 | ✅ Blocked (link-local) |

## Allowlist Derivation Strategy

### How Allowlist Entries Are Generated

1. **MX Record Derivation**
   - Entries are derived ONLY from DNS MX record responses
   - Target hosts extracted from MX priority hostname field
   - Port fixed at 25 (SMTP) or 443 (HTTPS for MTA-STS)

2. **TTL-Based Expiry**
   - Default: 5 minutes (configurable via `PROBE_TTL_MS`)
   - Entries auto-expire to prevent stale access
   - Fresh DNS lookup required for new probes

3. **Audit Trail**
   - Each entry tracks derivation source (domain, query type, answer data)
   - Supports investigation of probe destinations

### Allowlist Verification

```
PR-06.3 Tests:
- Non-allowlisted domain rejection: ✅
- MX-derived allowlisted domain acceptance: ✅
- Empty MX → empty allowlist: ✅
- DNS failure → empty allowlist: ✅
```

## Egress Identity

### Probe Source

- **Source IP**: Collector service egress IP
- **Identity**: Configured via collector service account
- **Rate Limits**: Configurable concurrency (1-20)

### Target Ports

| Service | Port | Protocol |
|---------|------|----------|
| SMTP | 25 | TCP |
| MTA-STS | 443 | HTTPS |
| Custom | Configurable | TCP/TLS |

## Rate Limits

### Configuration

| Parameter | Default | Min | Max |
|-----------|---------|-----|-----|
| `PROBE_CONCURRENCY` | 5 | 1 | 20 |
| `PROBE_TIMEOUT_MS` | 30000 | 1000 | 120000 |

### Enforcement

```
PR-06.2 Tests:
- Concurrency bounds verification: ✅
- Timeout enforcement: ✅
- Slow server handling: ✅
- Queue overflow protection: ✅
```

## Security Review Checklist

- [x] SSRF guard implemented
- [x] Allowlist derivation from DNS only
- [x] TTL-based expiry enforced
- [x] Rate limiting (concurrency) implemented
- [x] Timeout enforcement verified
- [x] Cloud metadata endpoints blocked
- [x] Private network ranges blocked
- [x] Audit trail for derivations
- [x] Integration tests for security controls

## Conclusion

### Safe to Enable

**Status:** ✅ SAFE TO ENABLE with standard precautions

The probe sandbox is safe to enable with the following standard precautions:

1. **Enable via Feature Flag**
   ```bash
   ENABLE_ACTIVE_PROBES=true
   ```

2. **Configure Rate Limits**
   ```bash
   PROBE_CONCURRENCY=5
   PROBE_TIMEOUT_MS=30000
   ```

3. **Monitor Egress**
   - Monitor collector service egress logs
   - Alert on anomalous probe patterns

### Remaining Gaps

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| None identified | - | - |

## Links

- Feature Flag: `apps/collector/src/config/env.ts`
- SSRF Guard: `apps/collector/src/probes/ssrf-guard.ts`
- Allowlist: `apps/collector/src/probes/allowlist.ts`
- Rate Limiting: `apps/collector/src/probes/probe-ratelimit.test.ts`
