# Phase 1 Query Scope

**Version:** 1.0  
**Effective Date:** 2026-03-17

## Purpose

This document defines the targeted inspection scope for DNS queries in phase 1 of the DNS Ops Workbench. It explicitly limits what names and record types are queried, especially for unmanaged zones.

## Scope Philosophy

### For Managed Zones
- **Full zone visibility** (not enumeration)
- Query all standard record types for zone apex
- Full DNSSEC validation
- Per-authoritative-server queries for consistency checks

### For Unmanaged Zones
- **Targeted inspection only**
- Query specific names relevant to mail and delegation
- No zone enumeration (AXFR/IXFR)
- No brute-force subdomain discovery
- Results default to `partial` visibility

## Phase 1 Record Types

The following record types are supported in phase 1:

| Type | Purpose | Managed | Unmanaged |
|------|---------|---------|-----------|
| A | IPv4 address resolution | ✓ Full | ✓ Targeted |
| AAAA | IPv6 address resolution | ✓ Full | ✓ Targeted |
| CNAME | Canonical name | ✓ Full | ✓ Targeted |
| MX | Mail exchanger | ✓ Full | ✓ Targeted |
| TXT | Text records (SPF, DKIM, DMARC) | ✓ Full | ✓ Targeted |
| NS | Name server delegation | ✓ Full | ✓ Targeted |
| SOA | Start of authority | ✓ Full | ✓ Targeted |
| CAA | Certificate Authority Authorization | ✓ Full | ✓ Targeted |

## Targeted Names for Unmanaged Zones

### Required Queries (All Unmanaged Zones)

| Name | Types | Purpose |
|------|-------|---------|
| `@` (apex) | NS, SOA, A, AAAA, MX, TXT, CAA | Zone delegation and basic records |
| `_dmarc` | TXT | DMARC policy |
| `*._domainkey` | TXT | DKIM selectors (see below) |

### Conditional Queries (Based on Discovery)

| Trigger | Query | Types |
|---------|-------|-------|
| MX record found | MX target hostname | A, AAAA |
| CNAME found | CNAME target | A, AAAA |
| SPF in TXT | Included domains | TXT (shallow) |
| MTA-STS indicator | `_mta-sts` | TXT |
| TLS-RPT indicator | `_smtp._tls` | TXT |

### DKIM Selector Strategy

For unmanaged zones, DKIM selectors are discovered through:

1. **Provider heuristics** (top 3-5 providers only)
   - Google Workspace: `google`, `default`
   - Microsoft 365: `selector1`, `selector2`
   - Amazon SES: `amazonses`

2. **Limited common selector dictionary**
   - `default`, `dkim`, `mail`, `smtp`

3. **Maximum attempts:** 6 selectors per domain

### Query Scope Display in UI

For unmanaged zones, the UI must display:

```
┌─────────────────────────────────────────────────────────┐
│  example-unmanaged.com                                  │
│  Status: partial ⚠️                                      │
│                                                         │
│  Scope: Targeted inspection only                        │
│  Queried: @, _dmarc, _mta-sts, 4 DKIM selectors        │
│  Types: A, AAAA, MX, TXT, NS, SOA, CAA                 │
│                                                         │
│  [?] This is not a complete zone enumeration.           │
│      Results are limited to mail-relevant records.      │
└─────────────────────────────────────────────────────────┘
```

## Prohibited Operations

The following are **never performed** for any zone type:

| Operation | Reason |
|-----------|--------|
| Zone transfer (AXFR) | Violates zone operator trust |
| Incremental zone transfer (IXFR) | Same as above |
| Brute-force subdomain enumeration | Resource abuse |
| DNSSEC NSEC walking | Information disclosure |
| ANY queries | Amplification risk, deprecated |

## Rate Limiting

| Zone Type | Query Rate | Burst |
|-----------|------------|-------|
| Managed | 100/second | 500 |
| Unmanaged | 10/second | 50 |

## Vantage Points

### For All Zones
- Public recursive resolver (e.g., 8.8.8.8)
- Authoritative nameserver queries

### For Managed Zones Only
- Parent zone delegation queries
- Per-authoritative-server queries for consistency checks

## UI Scope Indicators

### Badge System

| Badge | Meaning | Visibility |
|-------|---------|------------|
| 🟢 Complete | Full zone visibility | Managed zones |
| 🟡 Partial | Targeted inspection only | Unmanaged zones |
| 🔴 Failed | Could not collect data | Any zone with errors |

### Scope Warnings

For unmanaged zones, display warning when:
- User views records that were not queried
- User attempts operations requiring full zone data
- Results may be incomplete for troubleshooting

## Evolution Path

Future phases may expand scope with:
- Additional record types (SRV, HTTPS, etc.)
- Broader provider template support
- Portfolio-wide correlation (without enumeration)

Changes to scope require:
1. Security review
2. Privacy impact assessment
3. Documentation update
4. UI indicator updates

## Related Documents

- [Trust Boundary](./trust-boundary.md) - Non-DNS probe policies
- [Benchmark Corpus](../../packages/testkit/src/benchmark-corpus/index.ts) - Test cases
- [Enums](../../packages/contracts/src/enums.ts) - Type definitions
