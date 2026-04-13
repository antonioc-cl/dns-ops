import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useId, useRef, useMemo, useEffect, useCallback } from 'react';
import { p, u, x } from './StateDisplay-DMFHryPA.mjs';

const pe = [{ value: "all", label: "All statuses" }, { value: "pending", label: "Pending" }, { value: "sent", label: "Sent" }, { value: "suppressed", label: "Suppressed" }, { value: "acknowledged", label: "Acknowledged" }, { value: "resolved", label: "Resolved" }], be = [{ value: "all", label: "All severities" }, { value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }, { value: "info", label: "Info" }], fe = { critical: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-blue-100 text-blue-800", info: "bg-gray-100 text-gray-700" }, xe = { pending: "bg-red-50 text-red-700", sent: "bg-blue-50 text-blue-700", suppressed: "bg-gray-100 text-gray-700", acknowledged: "bg-amber-100 text-amber-800", resolved: "bg-green-100 text-green-800" };
function ye(t) {
  return ["pending", "sent", "suppressed"].includes(t);
}
function ve(t) {
  return ["pending", "sent", "acknowledged"].includes(t);
}
function Ne(t) {
  return ["pending", "sent", "acknowledged", "suppressed"].includes(t);
}
function Z(t) {
  return t ? new Date(t).toLocaleString() : "\u2014";
}
function we() {
  const [t, a] = useState([]), [o, S] = useState("all"), [g, b] = useState("all"), [f, h] = useState(true), [k, v] = useState(false), [w, m] = useState(null), [d, C] = useState(null), [y, i] = useState(false), [N, A] = useState(0), [F, s] = useState(0), [l, x$1] = useState(false), [u$1, E] = useState({}), [_, j] = useState({}), [I, P] = useState(null), c = useRef(0), L = 25, $ = useMemo(() => "/api/monitoring/domains", []), O = useCallback((p) => {
    const T = new URLSearchParams({ limit: String(L), offset: String(p) });
    return o !== "all" && T.set("status", o), g !== "all" && T.set("severity", g), `/api/alerts?${T.toString()}`;
  }, [g, o]), D = useCallback(async (p, T = 0) => {
    var _a, _b, _c, _d;
    const q = p ? 0 : T, M = ++c.current;
    p ? h(true) : v(true), m(null);
    try {
      const R = await fetch(O(q));
      if (M !== c.current) return;
      if (R.status === 401) {
        i(true), a([]), x$1(false), s(0);
        return;
      }
      if (R.status === 403) throw new Error("You do not have permission to view tenant alerts.");
      if (!R.ok) {
        const B = await R.json().catch(() => ({}));
        throw new Error(B.error || "Failed to load alerts");
      }
      const Y = await R.json();
      let re = {};
      try {
        const B = await fetch($);
        if (B.ok) {
          const me = await B.json();
          re = Object.fromEntries((me.monitoredDomains || []).map((ae) => [ae.id, ae.domainName]));
        }
      } catch {
      }
      const J = (Y.alerts || []).map((B) => {
        var _a2;
        return { ...B, domainName: (_a2 = re[B.monitoredDomainId]) != null ? _a2 : null };
      });
      i(false), a((B) => p ? J : [...B, ...J]), A(q + J.length), x$1((_b = (_a = Y.pagination) == null ? void 0 : _a.hasMore) != null ? _b : false), s((_d = (_c = Y.pagination) == null ? void 0 : _c.total) != null ? _d : J.length);
    } catch (R) {
      if (M !== c.current) return;
      m(R instanceof Error ? R.message : "Failed to load alerts");
    } finally {
      M === c.current && (h(false), v(false));
    }
  }, [O, $]);
  useEffect(() => {
    P(null), j({}), C(null), A(0), D(true, 0);
  }, [D]);
  const z = async (p, T, q) => {
    E((M) => ({ ...M, [p]: T })), m(null), C(null);
    try {
      const M = await fetch(`/api/alerts/${p}/${T}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: T === "resolve" ? JSON.stringify({ resolutionNote: q }) : void 0 });
      if (M.status === 401) {
        i(true), a([]), x$1(false), s(0), P(null), j({}), C("Operator sign-in is required to update alerts.");
        return;
      }
      if (M.status === 403) {
        P(null), j({}), C("You do not have permission to update this alert.");
        return;
      }
      if (!M.ok) {
        const R = await M.json().catch(() => ({}));
        throw new Error(R.error || `Failed to ${T} alert`);
      }
      P(null), j({}), A(0), await D(true, 0);
    } catch (M) {
      C(M instanceof Error ? M.message : `Failed to ${T} alert`), await D(true, 0);
    } finally {
      E((M) => ({ ...M, [p]: null }));
    }
  };
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [jsxs("div", { children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Alerts" }), jsx("p", { className: "text-sm text-gray-500", children: "Review alert state, triage, and resolve operator-visible issues" })] }), jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [jsxs("label", { className: "text-sm text-gray-600", children: [jsx("span", { className: "sr-only", children: "Filter by status" }), jsx("select", { value: o, onChange: (p) => S(p.target.value), disabled: y, className: "rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500", children: pe.map((p) => jsx("option", { value: p.value, children: p.label }, p.value)) })] }), jsxs("label", { className: "text-sm text-gray-600", children: [jsx("span", { className: "sr-only", children: "Filter by severity" }), jsx("select", { value: g, onChange: (p) => b(p.target.value), disabled: y, className: "rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500", children: be.map((p) => jsx("option", { value: p.value, children: p.label }, p.value)) })] })] })] }), jsxs("div", { className: "p-4 space-y-4", children: [y ? jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to review or mutate tenant alerts." }) : null, w ? jsx(p, { title: "Alerts unavailable", message: w, onRetry: () => void D(true, 0), size: "sm" }) : null, d ? jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", children: d }) : null, f ? jsx(u, { message: "Loading alerts...", size: "md" }) : y ? jsx(x, { icon: "shield", title: "Sign in required", description: "Sign in to review and manage tenant alerts." }) : t.length === 0 ? jsx(x, { icon: "inbox", title: o === "all" && g === "all" ? "No alerts yet" : "No alerts match these filters", description: o === "all" && g === "all" ? "Once monitored domains produce alerts, they will appear here." : "Try broadening the current status or severity filters." }) : jsxs("div", { className: "space-y-3", children: [jsxs("div", { className: "text-sm text-gray-500", children: ["Showing ", t.length, " of ", F, " alerts"] }), t.map((p) => {
    const T = u$1[p.id], q = _[p.id] || "", M = I === p.id;
    return jsxs("div", { className: "rounded-lg border border-gray-200 p-4 space-y-3", children: [jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", children: [jsxs("div", { className: "min-w-0", children: [jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [p.domainName ? jsx(Link, { to: "/domain/$domain", params: { domain: p.domainName.toLowerCase() }, className: "font-medium text-blue-600 hover:text-blue-700", children: p.domainName }) : jsx("h4", { className: "font-medium text-gray-900", children: "Unknown domain" }), jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${fe[p.severity]}`, children: p.severity }), jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium ${xe[p.status]}`, children: p.status })] }), jsx("p", { className: "mt-1 text-sm font-medium text-gray-800", children: p.title }), jsx("p", { className: "mt-1 text-sm text-gray-600", children: p.description })] }), jsxs("div", { className: "text-xs text-gray-500 text-left sm:text-right", children: [jsxs("div", { children: ["Created ", Z(p.createdAt)] }), p.acknowledgedAt ? jsxs("div", { children: ["Acknowledged ", Z(p.acknowledgedAt)] }) : null, p.resolvedAt ? jsxs("div", { children: ["Resolved ", Z(p.resolvedAt)] }) : null] })] }), p.resolutionNote ? jsxs("div", { className: "rounded bg-gray-50 px-3 py-2 text-sm text-gray-600", children: ["Resolution note: ", p.resolutionNote] }) : null, jsxs("div", { className: "flex flex-wrap gap-2", children: [ye(p.status) ? jsx("button", { type: "button", disabled: !!T || y, onClick: () => void z(p.id, "acknowledge"), className: "focus-ring rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400", children: T === "acknowledge" ? "Acknowledging..." : "Acknowledge" }) : null, ve(p.status) ? jsx("button", { type: "button", disabled: !!T || y, onClick: () => void z(p.id, "suppress"), className: "focus-ring rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400", children: T === "suppress" ? "Suppressing..." : "Suppress" }) : null, Ne(p.status) ? jsx("button", { type: "button", disabled: !!T || y, onClick: () => {
      P(M ? null : p.id), j((R) => {
        var _a, _b;
        return { ...R, [p.id]: (_b = (_a = R[p.id]) != null ? _a : p.resolutionNote) != null ? _b : "" };
      });
    }, className: "focus-ring rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400", children: "Resolve" }) : null] }), M ? jsxs("div", { className: "rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2", children: [jsxs("label", { className: "block text-sm font-medium text-gray-700", children: ["Resolution note", jsx("textarea", { value: q, onChange: (R) => j((Y) => ({ ...Y, [p.id]: R.target.value })), rows: 3, disabled: !!T || y, className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100", placeholder: "Describe how this alert was resolved" })] }), jsxs("div", { className: "flex flex-wrap gap-2", children: [jsx("button", { type: "button", disabled: !!T || y, onClick: () => void z(p.id, "resolve", q.trim() || void 0), className: "focus-ring rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:bg-gray-400", children: T === "resolve" ? "Resolving..." : "Confirm Resolve" }), jsx("button", { type: "button", disabled: !!T, onClick: () => P(null), className: "focus-ring rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50", children: "Cancel" })] })] }) : null] }, p.id);
  }), l ? jsx("button", { type: "button", disabled: k || y, onClick: () => void D(false, N), className: "focus-ring rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400", children: k ? "Loading more..." : "Load more alerts" }) : null] })] })] });
}
const ke = { domain_note_created: "Created note", domain_note_updated: "Updated note", domain_note_deleted: "Deleted note", domain_tag_added: "Added tag", domain_tag_removed: "Removed tag", filter_created: "Created filter", filter_updated: "Updated filter", filter_deleted: "Deleted filter", template_override_created: "Created override", template_override_updated: "Updated override", template_override_deleted: "Deleted override", remediation_request_created: "Created remediation request", remediation_request_updated: "Updated remediation request", shared_report_created: "Created shared report", shared_report_expired: "Expired shared report", monitored_domain_created: "Created monitored domain", monitored_domain_updated: "Updated monitored domain", monitored_domain_deleted: "Deleted monitored domain", monitored_domain_toggled: "Toggled monitored domain", alert_acknowledged: "Acknowledged alert", alert_resolved: "Resolved alert", alert_suppressed: "Suppressed alert" }, ne = { note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z", filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z", override: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", remediation: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", shared: "M17 20h5V4H2v16h5m10 0v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0H7", monitored: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }, Ce = { created: "text-green-600 bg-green-50", updated: "text-blue-600 bg-blue-50", deleted: "text-red-600 bg-red-50", added: "text-green-600 bg-green-50", removed: "text-red-600 bg-red-50" };
function Se() {
  const [t, a] = useState([]), [o, S] = useState(true), [g, b] = useState(null), [f, h] = useState(false), [k, v] = useState(20), [w, m] = useState(null), d = useCallback(async () => {
    S(true), b(null);
    try {
      const i = await fetch(`/api/portfolio/audit?limit=${k}`);
      if (!i.ok) {
        if (i.status === 401) {
          h(true), a([]);
          return;
        }
        throw i.status === 403 ? new Error("You do not have permission to view the tenant audit log.") : new Error("Failed to fetch audit log");
      }
      h(false);
      const N = await i.json();
      a(N.events || []);
    } catch (i) {
      b(i instanceof Error ? i.message : "Failed to load audit log");
    } finally {
      S(false);
    }
  }, [k]);
  useEffect(() => {
    d();
  }, [d]);
  const C = (i) => i.includes("note") ? "note" : i.includes("tag") ? "tag" : i.includes("filter") ? "filter" : i.includes("override") ? "override" : i.includes("remediation") ? "remediation" : i.includes("shared_report") ? "shared" : i.includes("monitored_domain") ? "monitored" : i.includes("alert_") ? "alert" : "note", y = (i) => i.includes("created") ? "created" : i.includes("updated") ? "updated" : i.includes("deleted") ? "deleted" : i.includes("added") ? "added" : i.includes("removed") || i.includes("suppressed") ? "removed" : i.includes("acknowledged") ? "updated" : i.includes("resolved") ? "created" : (i.includes("toggled"), "updated");
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200 flex items-center justify-between", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Audit Log" }), jsx("button", { type: "button", onClick: d, disabled: o || f, className: "text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50", children: "Refresh" })] }), jsxs("div", { className: "p-4", children: [f && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view the tenant audit log." }), g && jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm", children: [g, jsx("button", { type: "button", onClick: () => b(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), o ? jsx("div", { className: "text-center text-gray-500 py-8", children: "Loading audit log..." }) : f ? jsx("div", { className: "text-center text-gray-500 py-8", children: "Sign in to view the tenant audit log." }) : t.length === 0 ? jsx("div", { className: "text-center text-gray-500 py-8", children: "No audit events found" }) : jsxs("div", { className: "space-y-3", children: [t.map((i) => jsx(Ee, { event: i, isExpanded: w === i.id, onToggle: () => m(w === i.id ? null : i.id), category: C(i.action), colorKey: y(i.action) }, i.id)), t.length >= k && jsx("div", { className: "text-center pt-2", children: jsx("button", { type: "button", onClick: () => v(k + 20), className: "text-sm text-blue-600 hover:text-blue-700", children: "Load more events" }) })] })] })] });
}
function Ee({ event: t, isExpanded: a, onToggle: o, category: S, colorKey: g }) {
  const b = ne[S] || ne.note, f = Ce[g] || "text-gray-600 bg-gray-50", h = (k) => {
    const v = new Date(k), m = (/* @__PURE__ */ new Date()).getTime() - v.getTime(), d = Math.floor(m / 6e4), C = Math.floor(m / 36e5), y = Math.floor(m / 864e5);
    return d < 1 ? "just now" : d < 60 ? `${d}m ago` : C < 24 ? `${C}h ago` : y < 7 ? `${y}d ago` : v.toLocaleDateString();
  };
  return jsxs("div", { className: "flex gap-3", children: [jsx("div", { className: `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${f}`, children: jsx("svg", { "aria-hidden": "true", className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: b }) }) }), jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { children: [jsx("span", { className: "font-medium text-gray-900", children: ke[t.action] || t.action }), jsxs("span", { className: "text-gray-500 text-sm ml-2", children: ["by ", t.actorEmail || t.actorId] })] }), jsx("span", { className: "text-xs text-gray-400 flex-shrink-0", children: h(t.createdAt) })] }), jsxs("p", { className: "text-sm text-gray-600 mt-0.5", children: [t.entityType, " ", jsxs("span", { className: "font-mono text-xs", children: [t.entityId.slice(0, 8), "..."] })] }), (t.previousValue || t.newValue) && jsx("button", { type: "button", onClick: o, className: "mt-1 text-xs text-gray-500 hover:text-gray-700", children: a ? "Hide details" : "Show details" }), a && jsxs("div", { className: "mt-2 space-y-2", children: [t.previousValue && jsxs("div", { children: [jsx("p", { className: "text-xs font-medium text-gray-500", children: "Before:" }), jsx("pre", { className: "mt-1 bg-red-50 p-2 rounded text-xs text-red-800 overflow-x-auto", children: JSON.stringify(t.previousValue, null, 2) })] }), t.newValue && jsxs("div", { children: [jsx("p", { className: "text-xs font-medium text-gray-500", children: "After:" }), jsx("pre", { className: "mt-1 bg-green-50 p-2 rounded text-xs text-green-800 overflow-x-auto", children: JSON.stringify(t.newValue, null, 2) })] })] })] })] });
}
const De = [{ id: "mail-security-baseline", name: "Mail Security Baseline", description: "Check SPF, DMARC, DKIM across inventory", checks: ["spf", "dmarc", "dkim", "mx"] }, { id: "infrastructure-audit", name: "Infrastructure Audit", description: "Identify stale IPs and infrastructure issues", checks: ["infrastructure", "delegation"] }, { id: "full-check", name: "Full Check", description: "Complete check of all aspects", checks: ["spf", "dmarc", "dkim", "mx", "infrastructure", "delegation"] }];
function Ae() {
  var _a, _b;
  const t = useId(), a = De, [o, S] = useState(null), [g, b] = useState(""), [f, h] = useState(false), [k, v] = useState(null), [w, m] = useState(false), [d, C] = useState(null), [y, i] = useState(false), N = (s) => s.split(/[\n,]/).map((l) => l.trim().toLowerCase()).filter((l) => l == null ? void 0 : l.includes(".")), A = useCallback(async (s) => {
    try {
      const l = await s.text(), x = await fetch("/api/fleet-report/import-csv", { method: "POST", body: l });
      if (!x.ok) {
        if (x.status === 401) throw m(true), new Error("Operator sign-in is required to import fleet report inventories.");
        if (x.status === 403) throw new Error("You do not have permission to import fleet report inventories.");
        const E = await x.json().catch(() => ({}));
        throw new Error(E.error || "Failed to parse CSV");
      }
      m(false);
      const u = await x.json();
      b(u.inventory.join(`
`));
    } catch (l) {
      v(l instanceof Error ? l.message : "Failed to import CSV");
    }
  }, []), F = async () => {
    const s = N(g);
    if (s.length === 0) {
      v("Please enter at least one domain");
      return;
    }
    if (!o) {
      v("Please select a report template");
      return;
    }
    h(true), v(null), C(null);
    try {
      const l = await fetch("/api/fleet-report/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventory: s, checks: o.checks, format: "detailed" }) });
      if (!l.ok) {
        if (l.status === 401) throw m(true), new Error("Operator sign-in is required to run fleet reports.");
        if (l.status === 403) throw new Error("You do not have permission to run fleet reports.");
        const u = await l.json().catch(() => ({}));
        throw new Error(u.error || "Failed to run report");
      }
      m(false);
      const x = await l.json();
      C(x);
    } catch (l) {
      v(l instanceof Error ? l.message : "Failed to run report");
    } finally {
      h(false);
    }
  };
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Fleet Reports" }), jsx("p", { className: "text-sm text-gray-500", children: "Run bulk checks across your domain inventory" })] }), jsxs("div", { className: "p-4 space-y-4", children: [w && jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to import inventory or run tenant fleet reports." }), k && jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm", children: [k, jsx("button", { type: "button", onClick: () => v(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), jsxs("div", { children: [jsx("p", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Report Template" }), jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: a.map((s) => jsxs("button", { type: "button", onClick: () => S(s), className: `p-3 text-left rounded-lg border-2 transition-colors ${(o == null ? void 0 : o.id) === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`, children: [jsx("div", { className: "font-medium text-gray-900", children: s.name }), jsx("p", { className: "text-xs text-gray-500 mt-1", children: s.description }), jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: s.checks.map((l) => jsx("span", { className: "px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600 uppercase", children: l }, l)) })] }, s.id)) })] }), jsxs("div", { children: [jsx("label", { htmlFor: t, className: "block text-sm font-medium text-gray-700 mb-1", children: "Domain Inventory" }), jsx("textarea", { id: t, value: g, onChange: (s) => b(s.target.value), rows: 6, placeholder: `Enter domain names, one per line or comma-separated:
example.com
example.org, example.net`, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" }), jsxs("div", { className: "mt-2 flex items-center gap-4", children: [jsxs("span", { className: "text-xs text-gray-500", children: [N(g).length, " domains"] }), jsxs("label", { className: "text-xs text-blue-600 hover:text-blue-700 cursor-pointer", children: [jsx("input", { type: "file", accept: ".csv", className: "hidden", disabled: w, onChange: (s) => {
    var _a2;
    const l = (_a2 = s.target.files) == null ? void 0 : _a2[0];
    l && A(l);
  } }), "Import from CSV"] })] })] }), jsx("div", { className: "flex justify-end", children: jsx("button", { type: "button", onClick: F, disabled: w || f || !o || N(g).length === 0, className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: f ? "Running Report..." : "Run Report" }) }), d && jsxs("div", { className: "border-t pt-4 mt-4 space-y-4", children: [jsxs("div", { className: "flex items-center justify-between", children: [jsx("h4", { className: "font-medium text-gray-900", children: "Report Results" }), jsxs("span", { className: "text-sm text-gray-500", children: ["Generated ", new Date(d.reportGeneratedAt).toLocaleString()] })] }), jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [jsx(K, { label: "Domains Checked", value: d.domainsChecked, color: "blue" }), jsx(K, { label: "With Issues", value: d.summary.domainsWithIssues, color: d.summary.domainsWithIssues > 0 ? "yellow" : "green" }), jsx(K, { label: "High Priority", value: ((_a = d.highPriorityIssues) == null ? void 0 : _a.length) || 0, color: ((_b = d.highPriorityIssues) == null ? void 0 : _b.length) ? "red" : "green" }), jsx(K, { label: "Errors", value: d.domainsWithErrors, color: d.domainsWithErrors > 0 ? "orange" : "green" })] }), d.highPriorityIssues && d.highPriorityIssues.length > 0 && jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: [jsx("h5", { className: "font-medium text-red-900 mb-2", children: "High Priority Issues" }), jsxs("div", { className: "space-y-2", children: [d.highPriorityIssues.slice(0, 10).map((s) => jsxs("div", { className: "text-sm", children: [jsx("span", { className: `inline-block w-16 px-1.5 py-0.5 rounded text-xs text-center font-medium ${s.severity === "critical" ? "bg-red-600 text-white" : "bg-orange-500 text-white"}`, children: s.severity }), jsx("span", { className: "ml-2 text-gray-700", children: s.message })] }, `${s.severity}-${s.message}`)), d.highPriorityIssues.length > 10 && jsxs("p", { className: "text-xs text-red-700", children: ["...and ", d.highPriorityIssues.length - 10, " more"] })] })] }), d.results && d.results.length > 0 && jsxs("div", { children: [jsx("button", { type: "button", onClick: () => i(!y), className: "text-sm text-blue-600 hover:text-blue-700 font-medium", children: y ? "Hide Details" : "Show Domain Details" }), y && jsx("div", { className: "mt-3 space-y-2 max-h-96 overflow-y-auto", children: d.results.map((s) => jsx(Le, { result: s }, s.domain)) })] }), d.errors && d.errors.length > 0 && jsxs("div", { className: "bg-orange-50 border border-orange-200 rounded-lg p-4", children: [jsx("h5", { className: "font-medium text-orange-900 mb-2", children: "Errors" }), jsxs("div", { className: "space-y-1 text-sm text-orange-800", children: [d.errors.slice(0, 10).map((s) => jsxs("div", { children: [jsx("span", { className: "font-mono", children: s.domain }), ": ", s.error] }, `${s.domain}-${s.error}`)), d.errors.length > 10 && jsxs("p", { className: "text-xs", children: ["...and ", d.errors.length - 10, " more"] })] })] })] })] })] });
}
function K({ label: t, value: a, color: o }) {
  return jsxs("div", { className: `p-3 rounded-lg ${{ blue: "bg-blue-50 text-blue-900", green: "bg-green-50 text-green-900", yellow: "bg-yellow-50 text-yellow-900", red: "bg-red-50 text-red-900", orange: "bg-orange-50 text-orange-900" }[o]}`, children: [jsx("div", { className: "text-2xl font-bold tabular-nums", children: a }), jsx("div", { className: "text-sm", children: t })] });
}
function Le({ result: t }) {
  const [a, o] = useState(false), S = t.issues.length > 0;
  return jsxs("div", { className: `p-3 rounded-lg border ${S ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-gray-50"}`, children: [jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { children: [jsx("span", { className: "font-medium text-gray-900", children: t.domain }), jsxs("span", { className: "ml-2 text-xs text-gray-500", children: [t.findingsCount, " findings"] })] }), jsxs("button", { type: "button", onClick: () => o(!a), className: "text-sm text-gray-500 hover:text-gray-700", children: [a ? "Hide" : "Show", " checks"] })] }), a && jsx("div", { className: "mt-2 space-y-1", children: t.checks.map((g) => jsxs("div", { className: "flex items-center gap-2 text-sm", children: [jsx(Te, { status: g.status }), jsx("span", { className: "uppercase text-xs font-medium text-gray-600 w-20", children: g.check }), jsx("span", { className: "text-gray-700", children: g.message })] }, `${g.check}-${g.status}-${g.message}`)) })] });
}
function Te({ status: t }) {
  const a = { pass: "bg-green-100 text-green-700", fail: "bg-red-100 text-red-700", warning: "bg-yellow-100 text-yellow-700", missing: "bg-gray-100 text-gray-600" }, o = { pass: "\u2713", fail: "\u2717", warning: "!", missing: "?" };
  return jsx("span", { className: `w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${a[t]}`, children: o[t] });
}
const Me = [{ value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }];
function Fe() {
  const [t, a] = useState([]), [o, S] = useState(true), [g, b] = useState(null), [f, h] = useState(false), [k, v] = useState(false), [w, m] = useState(null), d = useCallback(async () => {
    S(true), b(null);
    try {
      const i = await fetch("/api/monitoring/domains");
      if (!i.ok) {
        if (i.status === 401) {
          h(true), a([]);
          return;
        }
        throw i.status === 403 ? new Error("You do not have permission to view monitored domains.") : new Error("Failed to fetch monitored domains");
      }
      h(false);
      const N = await i.json();
      a(N.monitoredDomains || []);
    } catch (i) {
      b(i instanceof Error ? i.message : "Failed to load monitored domains");
    } finally {
      S(false);
    }
  }, []);
  useEffect(() => {
    d();
  }, [d]);
  const C = async (i) => {
    if (confirm("Are you sure you want to remove this domain from monitoring?")) try {
      const N = await fetch(`/api/monitoring/domains/${i}`, { method: "DELETE" });
      if (!N.ok) {
        if (N.status === 401) {
          h(true), a([]);
          return;
        }
        throw N.status === 403 ? new Error("You do not have permission to delete monitored domains.") : new Error("Failed to delete");
      }
      await d();
    } catch (N) {
      b(N instanceof Error ? N.message : "Failed to delete");
    }
  }, y = async (i) => {
    try {
      const N = await fetch(`/api/monitoring/domains/${i}/toggle`, { method: "POST" });
      if (!N.ok) {
        if (N.status === 401) {
          h(true), a([]);
          return;
        }
        throw N.status === 403 ? new Error("You do not have permission to update monitored domains.") : new Error("Failed to toggle");
      }
      await d();
    } catch (N) {
      b(N instanceof Error ? N.message : "Failed to toggle");
    }
  };
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200 flex items-center justify-between", children: [jsxs("div", { children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Monitored Domains" }), jsx("p", { className: "text-sm text-gray-500", children: "Configure automatic monitoring and alerts" })] }), jsx("button", { type: "button", onClick: () => v(true), disabled: f, className: "px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: "+ Add Domain" })] }), jsxs("div", { className: "p-4", children: [f && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or change monitored domains." }), g && jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm", children: [g, jsx("button", { type: "button", onClick: () => b(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), (k || w) && jsx(je, { editingDomain: w, authRequired: f, onAuthRequired: () => {
    h(true), a([]), v(false), m(null);
  }, onClose: () => {
    v(false), m(null);
  }, onSave: async () => {
    await d(), v(false), m(null);
  } }), o ? jsx("div", { className: "text-center text-gray-500 py-8", children: "Loading monitored domains..." }) : f ? jsx("div", { className: "text-center py-8 text-gray-500", children: "Sign in to view and manage tenant monitoring configuration." }) : t.length === 0 ? jsxs("div", { className: "text-center py-8", children: [jsx("div", { className: "text-gray-400 mb-2", children: jsx("svg", { className: "w-12 h-12 mx-auto", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", "aria-hidden": "true", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }) }) }), jsx("p", { className: "text-gray-500", children: "No domains are being monitored yet." }), jsx("button", { type: "button", onClick: () => v(true), disabled: f, className: "mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400", children: "Add your first domain" })] }) : jsx("div", { className: "space-y-3", children: t.map((i) => jsx(Ie, { domain: i, onEdit: () => m(i), onDelete: () => C(i.id), onToggle: () => y(i.id), disabled: f }, i.id)) })] })] });
}
function Ie({ domain: t, onEdit: a, onDelete: o, onToggle: S, disabled: g = false }) {
  const b = (h) => {
    if (!h) return "Never";
    const k = new Date(h), w = (/* @__PURE__ */ new Date()).getTime() - k.getTime(), m = Math.floor(w / 6e4), d = Math.floor(w / 36e5), C = Math.floor(w / 864e5);
    return m < 1 ? "just now" : m < 60 ? `${m}m ago` : d < 24 ? `${d}h ago` : C < 7 ? `${C}d ago` : k.toLocaleDateString();
  }, f = () => {
    var _a;
    const h = [];
    return ((_a = t.alertChannels.email) == null ? void 0 : _a.length) && h.push(`${t.alertChannels.email.length} email(s)`), t.alertChannels.webhook && h.push("webhook"), t.alertChannels.slack && h.push("slack"), h.length > 0 ? h.join(", ") : "None configured";
  };
  return jsx("div", { className: `p-4 rounded-lg border ${t.isActive ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"}`, children: jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx(Link, { to: "/domain/$domain", params: { domain: t.domainName.toLowerCase() }, className: "font-medium text-blue-600 hover:text-blue-700", children: t.domainName }), jsx("span", { className: `px-2 py-0.5 rounded text-xs font-medium ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`, children: t.isActive ? "Active" : "Paused" }), jsx("span", { className: "px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium capitalize", children: t.schedule })] }), jsxs("div", { className: "mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm", children: [jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Last check:" }), " ", jsx("span", { className: "text-gray-700", children: b(t.lastCheckAt) })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Last alert:" }), " ", jsx("span", { className: "text-gray-700", children: b(t.lastAlertAt) })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Max alerts/day:" }), " ", jsx("span", { className: "text-gray-700", children: t.maxAlertsPerDay })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Channels:" }), " ", jsx("span", { className: "text-gray-700", children: f() })] })] })] }), jsxs("div", { className: "flex items-center gap-1 ml-4", children: [jsx("button", { type: "button", onClick: S, className: "p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:hover:bg-transparent", title: t.isActive ? "Pause monitoring" : "Resume monitoring", disabled: g, children: t.isActive ? jsx("svg", { "aria-hidden": "true", className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" }) }) : jsxs("svg", { "aria-hidden": "true", className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" }), jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })] }) }), jsx("button", { type: "button", onClick: a, className: "p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:text-gray-300 disabled:hover:bg-transparent", title: "Edit", disabled: g, children: jsx("svg", { "aria-hidden": "true", className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), jsx("button", { type: "button", onClick: o, className: "p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:text-gray-300 disabled:hover:bg-transparent", title: "Remove from monitoring", disabled: g, children: jsx("svg", { "aria-hidden": "true", className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] })] }) });
}
function je({ editingDomain: t, authRequired: a, onAuthRequired: o, onClose: S, onSave: g }) {
  var _a, _b, _c;
  const b = useId(), f = `${b}-domain-name`, h = `${b}-schedule`, k = `${b}-emails`, v = `${b}-webhook`, w = `${b}-slack`, m = `${b}-max-alerts`, d = `${b}-suppression`, [C, y] = useState((t == null ? void 0 : t.domainName) || ""), [i, N] = useState((t == null ? void 0 : t.schedule) || "daily"), [A, F] = useState(((_a = t == null ? void 0 : t.alertChannels.email) == null ? void 0 : _a.join(", ")) || ""), [s, l] = useState((t == null ? void 0 : t.alertChannels.webhook) || ""), [x, u] = useState((t == null ? void 0 : t.alertChannels.slack) || ""), [E, _] = useState(((_b = t == null ? void 0 : t.maxAlertsPerDay) == null ? void 0 : _b.toString()) || "5"), [j, I] = useState(((_c = t == null ? void 0 : t.suppressionWindowMinutes) == null ? void 0 : _c.toString()) || "60"), [P, c] = useState(false), [L, $] = useState(null);
  return jsx("div", { className: "mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200", children: jsxs("form", { onSubmit: async (D) => {
    if (D.preventDefault(), !t && !C.trim()) {
      $("Domain name is required");
      return;
    }
    c(true), $(null);
    try {
      const z = A.split(",").map((M) => M.trim()).filter(Boolean), p = { ...t ? {} : { domainName: C.trim() }, schedule: i, alertChannels: { ...z.length > 0 && { email: z }, ...s.trim() && { webhook: s.trim() }, ...x.trim() && { slack: x.trim() } }, maxAlertsPerDay: parseInt(E, 10) || 5, suppressionWindowMinutes: parseInt(j, 10) || 60 }, T = t ? `/api/monitoring/domains/${t.id}` : "/api/monitoring/domains", q = await fetch(T, { method: t ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      if (!q.ok) {
        if (q.status === 401) throw o(), new Error("Operator sign-in is required to save monitoring configuration.");
        if (q.status === 403) throw new Error("You do not have permission to save monitoring configuration.");
        const M = await q.json().catch(() => ({}));
        throw new Error(M.error || "Failed to save");
      }
      await g();
    } catch (z) {
      $(z instanceof Error ? z.message : "Failed to save");
    } finally {
      c(false);
    }
  }, children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: t ? `Edit ${t.domainName}` : "Add Domain to Monitoring" }), L && jsx("div", { className: "mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm", children: L }), jsxs("div", { className: "space-y-3", children: [!t && jsxs("div", { children: [jsxs("label", { htmlFor: f, className: "block text-sm font-medium text-gray-700 mb-1", children: ["Domain Name ", jsx("span", { className: "text-red-500", children: "*" })] }), jsx("input", { type: "text", id: f, value: C, onChange: (D) => y(D.target.value), placeholder: "example.com", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100", disabled: a })] }), jsxs("div", { children: [jsx("label", { htmlFor: h, className: "block text-sm font-medium text-gray-700 mb-1", children: "Check Schedule" }), jsx("select", { id: h, value: i, onChange: (D) => N(D.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100", disabled: a, children: Me.map((D) => jsx("option", { value: D.value, children: D.label }, D.value)) })] }), jsxs("div", { className: "border-t pt-3", children: [jsx("h5", { className: "text-sm font-medium text-gray-700 mb-2", children: "Alert Channels" }), jsxs("div", { className: "space-y-2", children: [jsxs("div", { children: [jsx("label", { htmlFor: k, className: "block text-xs text-gray-500 mb-1", children: "Email addresses (comma-separated)" }), jsx("input", { type: "text", id: k, value: A, onChange: (D) => F(D.target.value), placeholder: "admin@example.com, ops@example.com", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100", disabled: a })] }), jsxs("div", { children: [jsx("label", { htmlFor: v, className: "block text-xs text-gray-500 mb-1", children: "Webhook URL" }), jsx("input", { type: "url", id: v, value: s, onChange: (D) => l(D.target.value), placeholder: "https://...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100", disabled: a })] }), jsxs("div", { children: [jsx("label", { htmlFor: w, className: "block text-xs text-gray-500 mb-1", children: "Slack Channel" }), jsx("input", { type: "text", id: w, value: x, onChange: (D) => u(D.target.value), placeholder: "#dns-alerts", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100", disabled: a })] })] })] }), jsxs("div", { className: "border-t pt-3", children: [jsx("h5", { className: "text-sm font-medium text-gray-700 mb-2", children: "Noise Budget" }), jsxs("div", { className: "grid grid-cols-2 gap-3", children: [jsxs("div", { children: [jsx("label", { htmlFor: m, className: "block text-xs text-gray-500 mb-1", children: "Max alerts per day" }), jsx("input", { type: "number", id: m, value: E, onChange: (D) => _(D.target.value), min: "1", max: "100", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100", disabled: a })] }), jsxs("div", { children: [jsx("label", { htmlFor: d, className: "block text-xs text-gray-500 mb-1", children: "Suppression window (minutes)" }), jsx("input", { type: "number", id: d, value: j, onChange: (D) => I(D.target.value), min: "1", max: "1440", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100", disabled: a })] })] })] })] }), jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: S, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: P || a, children: "Cancel" }), jsx("button", { type: "submit", disabled: P || a || !t && !C.trim(), className: "px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50", children: P ? "Saving..." : t ? "Update" : "Add Domain" })] })] }) });
}
const le = { query: "", tags: [], severities: [], zoneManagement: [] };
function U(t) {
  return { query: t.query.trim(), tags: Q(t.tags.map((a) => a.trim().toLowerCase()).filter(Boolean)), severities: Q(t.severities), zoneManagement: Q(t.zoneManagement) };
}
function Pe(t) {
  const a = U(t);
  return a.query.length > 0 || a.tags.length > 0 || a.severities.length > 0 || a.zoneManagement.length > 0;
}
function oe(t) {
  const a = U(t), o = {};
  return a.query && (o.domainPatterns = [a.query]), a.tags.length > 0 && (o.tags = a.tags), a.severities.length > 0 && (o.findings = { severities: a.severities }), a.zoneManagement.length > 0 && (o.zoneManagement = a.zoneManagement), o;
}
function Oe(t) {
  const a = U(t);
  return { ...a.query ? { query: a.query } : {}, ...a.tags.length > 0 ? { tags: a.tags } : {}, ...a.severities.length > 0 ? { severities: a.severities } : {}, ...a.zoneManagement.length > 0 ? { zoneManagement: a.zoneManagement } : {}, limit: 20, offset: 0 };
}
function te(t) {
  var _a, _b;
  const a = [];
  return t.domainPatterns && t.domainPatterns.length > 1 && a.push("multiple domain patterns"), ((_a = t.findings) == null ? void 0 : _a.types) && t.findings.types.length > 0 && a.push("finding types"), ((_b = t.findings) == null ? void 0 : _b.minConfidence) && a.push("minimum confidence"), t.lastSnapshotWithin && a.push("snapshot recency"), { supported: a.length === 0, reasons: a };
}
function de(t) {
  var _a, _b;
  return U({ query: ((_a = t.domainPatterns) == null ? void 0 : _a.length) === 1 ? t.domainPatterns[0] : "", tags: t.tags || [], severities: ((_b = t.findings) == null ? void 0 : _b.severities) || [], zoneManagement: t.zoneManagement || [] });
}
function Q(t) {
  return [...new Set(t)];
}
const ce = ["critical", "high", "medium", "low", "info"], $e = ["managed", "unmanaged", "unknown"];
function Re({ currentFilters: t, onFiltersChange: a }) {
  const o = useId(), S = `${o}-portfolio-search-query`, g = `${o}-portfolio-search-tags`, [b, f] = useState([]), [h, k] = useState(true), [v, w] = useState(null), [m, d] = useState(false), [C, y] = useState(""), [i, N] = useState([]), [A, F] = useState(false), s = useRef(0), l = useMemo(() => U(t), [t]);
  useEffect(() => {
    async function c() {
      try {
        const L = await fetch("/api/portfolio/tags");
        if (!L.ok) return;
        const $ = await L.json();
        N($.tags || []);
      } catch {
      }
    }
    c();
  }, []), useEffect(() => {
    const c = ++s.current, L = new AbortController(), $ = window.setTimeout(async () => {
      k(true), w(null);
      try {
        const O = await fetch("/api/portfolio/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Oe(l)), signal: L.signal });
        if (c !== s.current) return;
        if (!O.ok) {
          if (O.status === 401 || O.status === 403) {
            d(true), f([]), F(true);
            return;
          }
          const z = await O.json().catch(() => ({}));
          throw new Error(z.error || "Failed to search portfolio");
        }
        d(false);
        const D = await O.json();
        f(D.domains || []), F(true);
      } catch (O) {
        if (L.signal.aborted || c !== s.current) return;
        w(O instanceof Error ? O.message : "Failed to search portfolio"), f([]), F(true);
      } finally {
        c === s.current && k(false);
      }
    }, 300);
    return () => {
      L.abort(), window.clearTimeout($);
    };
  }, [l]);
  const x = i.filter((c) => !l.tags.includes(c)), u = (c) => {
    a(U({ ...l, ...c }));
  }, E = (c) => {
    u({ severities: l.severities.includes(c) ? l.severities.filter((L) => L !== c) : [...l.severities, c] });
  }, _ = (c) => {
    u({ zoneManagement: l.zoneManagement.includes(c) ? l.zoneManagement.filter((L) => L !== c) : [...l.zoneManagement, c] });
  }, j = (c) => {
    const L = c.trim().toLowerCase();
    !L || l.tags.includes(L) || (u({ tags: [...l.tags, L] }), y(""));
  }, I = (c) => {
    u({ tags: l.tags.filter((L) => L !== c) });
  }, P = () => {
    y(""), a(le);
  };
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-white shadow-sm", children: [jsxs("div", { className: "border-b border-gray-200 px-4 py-3", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Portfolio Search" }), jsx("p", { className: "text-sm text-gray-500", children: "Search tenant domains by name, tag, severity, and zone-management state." })] }), jsxs("div", { className: "space-y-4 p-4", children: [m && jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to search tenant domains and load saved filters." }), v && jsxs("div", { className: "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800", children: [v, jsx("button", { type: "button", onClick: () => w(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), jsxs("div", { children: [jsx("label", { className: "mb-1 block text-sm font-medium text-gray-700", htmlFor: S, children: "Query" }), jsx("input", { id: S, type: "text", value: l.query, onChange: (c) => u({ query: c.target.value }), disabled: m, placeholder: "example.com", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" })] }), jsxs("div", { children: [jsx("label", { className: "mb-1 block text-sm font-medium text-gray-700", htmlFor: g, children: "Tags" }), jsxs("div", { className: "flex gap-2", children: [jsx("input", { id: g, type: "text", value: C, onChange: (c) => y(c.target.value), onKeyDown: (c) => {
    (c.key === "Enter" || c.key === ",") && (c.preventDefault(), j(C));
  }, disabled: m, placeholder: "Add a tag", className: "flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" }), jsx("button", { type: "button", onClick: () => j(C), disabled: m || C.trim().length === 0, className: "rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50", children: "Add" })] }), l.tags.length > 0 && jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: l.tags.map((c) => jsxs("button", { type: "button", onClick: () => I(c), disabled: m, className: "rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 disabled:opacity-60", children: [c, " \xD7"] }, c)) }), x.length > 0 && jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: x.slice(0, 8).map((c) => jsx("button", { type: "button", onClick: () => j(c), disabled: m, className: "rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 disabled:opacity-60", children: c }, c)) })] }), jsxs("fieldset", { children: [jsx("legend", { className: "mb-1 text-sm font-medium text-gray-700", children: "Severity" }), jsx("div", { className: "flex flex-wrap gap-3", children: ce.map((c) => jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-700", children: [jsx("input", { type: "checkbox", checked: l.severities.includes(c), onChange: () => E(c), disabled: m }), c] }, c)) })] }), jsxs("fieldset", { children: [jsx("legend", { className: "mb-1 text-sm font-medium text-gray-700", children: "Zone Management" }), jsx("div", { className: "flex flex-wrap gap-3", children: $e.map((c) => jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-700", children: [jsx("input", { type: "checkbox", checked: l.zoneManagement.includes(c), onChange: () => _(c), disabled: m }), c] }, c)) })] }), jsx("div", { className: "flex justify-end", children: jsx("button", { type: "button", onClick: P, disabled: m, className: "text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400", children: "Clear filters" }) }), jsxs("div", { className: "border-t border-gray-200 pt-4", children: [jsxs("div", { className: "mb-3 flex items-center justify-between", children: [jsx("h4", { className: "font-medium text-gray-900", children: "Results" }), !h && A && !m && jsx("span", { className: "text-sm text-gray-500", children: b.length === 20 ? "Showing first 20 matching domains. Refine filters to narrow results." : `Showing ${b.length} matching domain${b.length === 1 ? "" : "s"}` })] }), h ? jsx("div", { className: "py-8 text-center text-gray-500", children: "Searching portfolio..." }) : m ? jsx("div", { className: "py-8 text-center text-gray-500", children: "Sign in to search tenant domains." }) : v ? jsx("div", { className: "py-8 text-center text-gray-500", children: "Search is unavailable right now." }) : A ? b.length === 0 ? jsx("div", { className: "py-8 text-center text-gray-500", children: "No tenant domains matched the current filters." }) : jsx("div", { className: "space-y-3", children: b.map((c) => jsx(_e, { result: c }, c.id)) }) : jsx("div", { className: "py-8 text-center text-gray-500", children: "Search results will appear here." })] })] })] });
}
function _e({ result: t }) {
  const a = t.findings.reduce((o, S) => (o[S.severity] += 1, o), { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [jsx("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: jsxs("div", { children: [jsx(Link, { to: "/domain/$domain", params: { domain: t.normalizedName }, className: "text-base font-medium text-blue-600 hover:text-blue-700", children: t.name }), jsxs("div", { className: "mt-1 flex flex-wrap gap-2 text-xs text-gray-500", children: [jsx("span", { className: "rounded bg-white px-2 py-0.5 text-gray-700", children: t.zoneManagement }), t.latestSnapshot ? jsxs("span", { children: [t.latestSnapshot.resultState, " \xB7", " ", new Date(t.latestSnapshot.createdAt).toLocaleString()] }) : jsx("span", { children: "No snapshot available yet" })] })] }) }), jsx("div", { className: "mt-3 text-sm text-gray-600", children: t.findingsEvaluated ? t.findings.length === 0 ? jsx("span", { children: "No matching findings for the current filters." }) : jsx("div", { className: "flex flex-wrap gap-2", children: ce.filter((o) => a[o] > 0).map((o) => jsxs("span", { className: "rounded bg-white px-2 py-0.5 text-xs text-gray-700", children: [o, ": ", a[o]] }, o)) }) : jsx("span", { children: "Rules not evaluated yet." }) })] });
}
function qe({ currentFilters: t, onLoadFilter: a, onSaveComplete: o }) {
  const [S, g] = useState([]), [b, f] = useState(true), [h, k] = useState(null), [v, w] = useState(false), [m, d] = useState(false), [C, y] = useState(null), i = useCallback(async () => {
    f(true), k(null);
    try {
      const u = await fetch("/api/portfolio/filters");
      if (!u.ok) {
        if (u.status === 401) {
          w(true), g([]);
          return;
        }
        throw u.status === 403 ? (g([]), new Error("You do not have permission to view tenant saved filters.")) : new Error("Failed to fetch filters");
      }
      w(false);
      const E = await u.json();
      g(E.filters || []);
    } catch (u) {
      k(u instanceof Error ? u.message : "Failed to load filters");
    } finally {
      f(false);
    }
  }, []);
  useEffect(() => {
    i();
  }, [i]);
  const N = (u) => {
    const E = te(u.criteria);
    if (!E.supported) {
      k(`This saved filter uses unsupported criteria for the current UI: ${E.reasons.join(", ")}.`);
      return;
    }
    a(de(u.criteria));
  }, A = async (u) => {
    if (confirm("Are you sure you want to delete this filter?")) try {
      const E = await fetch(`/api/portfolio/filters/${u}`, { method: "DELETE" });
      if (!E.ok) throw E.status === 401 ? (w(true), new Error("Operator sign-in is required to delete saved filters.")) : E.status === 403 ? new Error("You do not have permission to delete this filter.") : new Error("Failed to delete filter");
      await i();
    } catch (E) {
      k(E instanceof Error ? E.message : "Failed to delete filter");
    }
  }, F = async (u) => {
    try {
      const E = await fetch(`/api/portfolio/filters/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isShared: !u.isShared }) });
      if (!E.ok) throw E.status === 401 ? (w(true), new Error("Operator sign-in is required to manage saved filters.")) : E.status === 403 ? new Error("You do not have permission to manage this filter.") : new Error("Failed to update filter");
      await i();
    } catch (E) {
      k(E instanceof Error ? E.message : "Failed to update filter");
    }
  }, s = v, l = Pe(t), x = U(t);
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-white shadow-sm", children: [jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-4 py-3", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Saved Filters" }), l && jsx("button", { type: "button", onClick: () => d(true), disabled: s, className: "text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400", children: "+ Save Current" })] }), jsxs("div", { className: "p-4", children: [v && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or manage saved filters." }), h && jsxs("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800", children: [h, jsx("button", { type: "button", onClick: () => k(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), (m || C) && jsx(Be, { currentFilters: t, editingFilter: C, authRequired: v, onAuthRequired: () => {
    w(true), d(false), y(null);
  }, onClose: () => {
    d(false), y(null);
  }, onSave: async () => {
    await i(), d(false), y(null), o == null ? void 0 : o();
  } }), b ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Loading saved filters..." }) : v ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Sign in to view tenant saved filters." }) : h && S.length === 0 ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Saved filters are unavailable right now." }) : S.length === 0 ? jsxs("div", { className: "py-4 text-center text-gray-500", children: ["No saved filters yet.", l && jsxs(Fragment, { children: [" ", jsx("button", { type: "button", onClick: () => d(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: s, children: "Save current filters" })] })] }) : jsx("div", { className: "space-y-3", children: S.map((u) => jsx(ze, { filter: u, isActive: He(x, u), onLoad: () => N(u), onEdit: () => y(u), onDelete: () => A(u.id), onToggleShare: () => F(u) }, u.id)) })] })] });
}
function ze({ filter: t, isActive: a, onLoad: o, onEdit: S, onDelete: g, onToggleShare: b }) {
  const f = Ue(t.criteria), h = te(t.criteria);
  return jsx("div", { className: `rounded-lg border p-3 ${a ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"}`, children: jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "min-w-0 flex-1", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("span", { className: "truncate font-medium text-gray-900", children: t.name }), t.isShared && jsx("span", { className: "rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700", children: "Shared" }), a && jsx("span", { className: "rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700", children: "Active" }), !h.supported && jsx("span", { className: "rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800", children: "Partial" })] }), t.description && jsx("p", { className: "mt-1 truncate text-sm text-gray-600", children: t.description }), jsxs("div", { className: "mt-1 text-xs text-gray-500", children: [f, " filter", f !== 1 ? "s" : "", " \xB7 owner ", t.createdBy] }), !h.supported && jsxs("p", { className: "mt-1 text-xs text-yellow-700", children: ["Unsupported criteria: ", h.reasons.join(", ")] })] }), jsxs("div", { className: "ml-2 flex items-center gap-1", children: [jsx("button", { type: "button", onClick: o, disabled: !h.supported, className: "rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:text-gray-300 disabled:hover:bg-transparent", title: h.supported ? "Load filter" : "Filter uses unsupported criteria", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }) }), jsx("button", { type: "button", onClick: S, disabled: !t.canManage, className: "rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:text-gray-300 disabled:hover:bg-transparent", title: t.canManage ? "Edit filter" : "Only the creator can edit this filter", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), jsx("button", { type: "button", onClick: b, disabled: !t.canManage, className: `rounded p-1.5 disabled:text-gray-300 disabled:hover:bg-transparent ${t.isShared ? "text-green-600 hover:bg-green-50 hover:text-green-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`, title: t.canManage ? t.isShared ? "Unshare filter" : "Share filter" : "Only the creator can share this filter", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" }) }) }), jsx("button", { type: "button", onClick: g, disabled: !t.canManage, className: "rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300 disabled:hover:bg-transparent", title: t.canManage ? "Delete filter" : "Only the creator can delete this filter", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] })] }) });
}
function Be({ currentFilters: t, editingFilter: a, authRequired: o, onAuthRequired: S, onClose: g, onSave: b }) {
  const f = useId(), h = `${f}-filter-name`, k = `${f}-filter-description`, v = `${f}-filter-shared`, [w, m] = useState((a == null ? void 0 : a.name) || ""), [d, C] = useState((a == null ? void 0 : a.description) || ""), [y, i] = useState((a == null ? void 0 : a.isShared) || false), [N, A] = useState(false), [F, s] = useState(null), l = async (u) => {
    if (u.preventDefault(), !w.trim()) {
      s("Name is required");
      return;
    }
    A(true), s(null);
    try {
      const E = a ? { name: w.trim(), description: d.trim() || null, isShared: y } : { name: w.trim(), description: d.trim() || null, criteria: oe(t), isShared: y }, _ = a ? `/api/portfolio/filters/${a.id}` : "/api/portfolio/filters", j = await fetch(_, { method: a ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(E) });
      if (!j.ok) {
        const I = await j.json().catch(() => ({}));
        throw j.status === 401 ? (S(), new Error("Operator sign-in is required to save filters.")) : j.status === 403 ? new Error("You do not have permission to manage this filter.") : new Error(I.error || "Failed to save filter");
      }
      await b();
    } catch (E) {
      s(E instanceof Error ? E.message : "Failed to save filter");
    } finally {
      A(false);
    }
  }, x = (a == null ? void 0 : a.criteria) || oe(t);
  return jsx("div", { className: "mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4", children: jsxs("form", { onSubmit: l, children: [jsx("h4", { className: "mb-3 font-medium text-gray-900", children: a ? "Edit Filter Metadata" : "Save Filter" }), a && jsx("p", { className: "mb-3 text-sm text-gray-600", children: "Editing updates name, description, and sharing only. Stored filter criteria stay unchanged." }), F && jsx("div", { className: "mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800", children: F }), jsxs("div", { className: "space-y-3", children: [jsxs("div", { children: [jsxs("label", { htmlFor: h, className: "mb-1 block text-sm font-medium text-gray-700", children: ["Name ", jsx("span", { className: "text-red-500", children: "*" })] }), jsx("input", { type: "text", id: h, value: w, onChange: (u) => m(u.target.value), placeholder: "e.g., Critical Issues", disabled: o, className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" })] }), jsxs("div", { children: [jsx("label", { htmlFor: k, className: "mb-1 block text-sm font-medium text-gray-700", children: "Description" }), jsx("input", { type: "text", id: k, value: d, onChange: (u) => C(u.target.value), placeholder: "Optional description...", disabled: o, className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" })] }), jsxs("div", { className: "flex items-center gap-2", children: [jsx("input", { type: "checkbox", id: v, checked: y, onChange: (u) => i(u.target.checked), disabled: o, className: "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), jsx("label", { htmlFor: v, className: "text-sm text-gray-700", children: "Share with team" })] }), jsxs("div", { className: "rounded border border-gray-200 bg-white p-2", children: [jsx("p", { className: "mb-1 text-xs font-medium text-gray-500", children: "Filter criteria:" }), jsx(We, { criteria: x })] })] }), jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: g, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: N || o, children: "Cancel" }), jsx("button", { type: "submit", disabled: N || o || !w.trim(), className: "rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: N ? "Saving..." : a ? "Update" : "Save" })] })] }) });
}
function We({ criteria: t }) {
  var _a, _b, _c, _d, _e2, _f, _g, _h;
  const a = [];
  return ((_a = t.domainPatterns) == null ? void 0 : _a.length) && a.push(...t.domainPatterns.map((o) => `Query: ${o}`)), ((_b = t.tags) == null ? void 0 : _b.length) && a.push(...t.tags), ((_d = (_c = t.findings) == null ? void 0 : _c.severities) == null ? void 0 : _d.length) && a.push(...t.findings.severities), ((_e2 = t.zoneManagement) == null ? void 0 : _e2.length) && a.push(...t.zoneManagement), ((_g = (_f = t.findings) == null ? void 0 : _f.types) == null ? void 0 : _g.length) && a.push(...t.findings.types.map((o) => `Type: ${o}`)), ((_h = t.findings) == null ? void 0 : _h.minConfidence) && a.push(`Confidence: ${t.findings.minConfidence}`), t.lastSnapshotWithin && a.push(`Snapshot <= ${t.lastSnapshotWithin}d`), a.length === 0 ? jsx("span", { className: "text-xs text-gray-400", children: "No filters selected" }) : jsx("div", { className: "flex flex-wrap gap-1", children: a.map((o) => jsx("span", { className: "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700", children: o }, o)) });
}
function He(t, a) {
  return te(a.criteria).supported ? JSON.stringify(U(t)) === JSON.stringify(de(a.criteria)) : false;
}
function Ue(t) {
  var _a, _b, _c, _d, _e2, _f, _g;
  let a = 0;
  return ((_a = t.domainPatterns) == null ? void 0 : _a.length) && (a += t.domainPatterns.length), ((_b = t.zoneManagement) == null ? void 0 : _b.length) && (a += t.zoneManagement.length), ((_c = t.tags) == null ? void 0 : _c.length) && (a += t.tags.length), ((_e2 = (_d = t.findings) == null ? void 0 : _d.severities) == null ? void 0 : _e2.length) && (a += t.findings.severities.length), ((_g = (_f = t.findings) == null ? void 0 : _f.types) == null ? void 0 : _g.length) && (a += t.findings.types.length), t.lastSnapshotWithin && (a += 1), a;
}
function Ve() {
  const [t, a] = useState([]), [o, S] = useState(""), [g, b] = useState(true), [f, h] = useState(false), [k, v] = useState(null), [w, m] = useState(null), [d, C] = useState(false), y = useId(), i = useMemo(() => "" , []), N = useCallback(async () => {
    b(true), m(null);
    try {
      const s = await fetch("/api/alerts/reports");
      if (!s.ok) {
        if (s.status === 401) {
          C(true), a([]);
          return;
        }
        if (s.status === 403) throw a([]), new Error("You do not have permission to view tenant shared reports.");
        const x = await s.json().catch(() => ({}));
        throw new Error(x.error || "Failed to load shared reports");
      }
      C(false);
      const l = await s.json();
      a(l.reports || []);
    } catch (s) {
      m(s instanceof Error ? s.message : "Failed to load shared reports");
    } finally {
      b(false);
    }
  }, []);
  useEffect(() => {
    N();
  }, [N]);
  const A = async () => {
    h(true), m(null);
    try {
      const s = await fetch("/api/alerts/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: o.trim() || void 0, visibility: "shared", expiresInDays: 7 }) });
      if (!s.ok) {
        if (s.status === 401) throw C(true), new Error("Operator sign-in is required to create shared reports.");
        if (s.status === 403) throw new Error("You do not have permission to create shared reports.");
        const l = await s.json().catch(() => ({}));
        throw new Error(l.error || "Failed to create shared report");
      }
      S(""), await N();
    } catch (s) {
      m(s instanceof Error ? s.message : "Failed to create shared report");
    } finally {
      h(false);
    }
  }, F = async (s) => {
    v(s), m(null);
    try {
      const l = await fetch(`/api/alerts/reports/${s}/expire`, { method: "POST" });
      if (!l.ok) {
        if (l.status === 401) throw C(true), new Error("Operator sign-in is required to expire shared reports.");
        if (l.status === 403) throw new Error("You do not have permission to expire this shared report.");
        const x = await l.json().catch(() => ({}));
        throw new Error(x.error || "Failed to expire shared report");
      }
      await N();
    } catch (l) {
      m(l instanceof Error ? l.message : "Failed to expire shared report");
    } finally {
      v(null);
    }
  };
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Shared Reports" }), jsx("p", { className: "text-sm text-gray-500", children: "Create persisted, redacted reports for external stakeholders" })] }), jsxs("div", { className: "p-4 space-y-4", children: [w ? jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", children: w }) : null, d ? jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to list or create tenant shared reports. Public share links continue to work without sign-in." }) : null, jsxs("div", { className: "rounded-lg border border-gray-200 p-4 space-y-3", children: [jsxs("div", { children: [jsx("label", { htmlFor: y, className: "block text-sm font-medium text-gray-700", children: "Report title" }), jsx("input", { id: y, type: "text", value: o, onChange: (s) => S(s.target.value), placeholder: "Weekly stakeholder report", disabled: d, className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 disabled:text-gray-500" })] }), jsx("button", { type: "button", onClick: () => void A(), disabled: f || d, className: "focus-ring min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400", children: f ? "Creating..." : "Create Shared Report" })] }), g ? jsx("p", { className: "text-sm text-gray-500", children: "Loading reports..." }) : d ? jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600", children: "Sign in to list and create tenant shared reports." }) : t.length === 0 ? jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600", children: "No shared reports yet." }) : jsx("div", { className: "space-y-3", children: t.map((s) => {
    const l = s.shareToken ? `${i}/api/alerts/reports/shared/${s.shareToken}` : null;
    return jsxs("div", { className: "rounded-lg border border-gray-200 p-4 space-y-2", children: [jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [jsxs("div", { children: [jsx("h4", { className: "font-medium text-gray-900", children: s.title }), jsxs("p", { className: "text-xs text-gray-500", children: [s.status, " \xB7 ", new Date(s.createdAt).toLocaleString()] })] }), jsxs("div", { className: "flex items-center gap-2", children: [jsx("span", { className: "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700", children: s.visibility }), s.status !== "expired" && !d ? jsx("button", { type: "button", onClick: () => void F(s.id), disabled: k === s.id, className: "rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:text-gray-400", children: k === s.id ? "Expiring..." : "Expire" }) : null] })] }), jsxs("p", { className: "text-sm text-gray-700", children: [s.summary.activeAlerts, " active alerts across", " ", s.summary.totalMonitored, " monitored domains."] }), l ? jsxs("div", { children: [jsx("p", { className: "text-xs font-medium uppercase tracking-wide text-gray-500", children: "Share link" }), jsx("a", { className: "text-sm text-blue-600 break-all hover:text-blue-700", href: l, children: l })] }) : null] }, s.id);
  }) })] })] });
}
const X = { google: "Google Workspace", microsoft: "Microsoft 365", zoho: "Zoho Mail", other: "Other Provider", gmail: "Gmail / Google Workspace", outlook: "Outlook / Microsoft 365", yahoo: "Yahoo Mail", protonmail: "ProtonMail", fastmail: "Fastmail", custom: "Custom Provider" };
function Ye() {
  const t = useId(), [a, o] = useState([]), [S, g] = useState(true), [b, f] = useState(null), [h, k] = useState(false), [v, w] = useState(false), [m, d] = useState(""), [C, y] = useState(null), [i, N] = useState(false), A = useCallback(async () => {
    if (!m) {
      o([]), g(false);
      return;
    }
    g(true), f(null);
    try {
      const x = await fetch(`/api/portfolio/templates/overrides?provider=${encodeURIComponent(m)}`);
      if (!x.ok) {
        if (x.status === 401) {
          k(true), o([]);
          return;
        }
        throw x.status === 403 ? (o([]), new Error("You do not have permission to view tenant template overrides.")) : new Error("Failed to fetch overrides");
      }
      k(false);
      const u = await x.json();
      o(u.overrides || []);
    } catch (x) {
      f(x instanceof Error ? x.message : "Failed to load overrides");
    } finally {
      g(false);
    }
  }, [m]);
  useEffect(() => {
    A();
  }, [A]);
  const F = async (x) => {
    if (confirm("Are you sure you want to delete this override?")) try {
      const u = await fetch(`/api/portfolio/templates/overrides/${x}`, { method: "DELETE" });
      if (!u.ok) throw u.status === 401 ? (k(true), new Error("Operator sign-in is required to delete overrides.")) : u.status === 403 ? (w(true), new Error("You do not have permission to delete tenant overrides.")) : new Error("Failed to delete override");
      k(false), await A();
    } catch (u) {
      f(u instanceof Error ? u.message : "Failed to delete override");
    }
  }, s = h, l = h || v;
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-white shadow-sm", children: [jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-4 py-3", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Template Overrides" }), jsx("button", { type: "button", onClick: () => N(true), disabled: l, className: "text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400", children: "+ New Override" })] }), jsxs("div", { className: "p-4", children: [h && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or edit tenant template overrides." }), v && jsx("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900", children: "You can view tenant overrides here, but your current role cannot create, edit, or delete them." }), jsxs("div", { className: "mb-4", children: [jsx("label", { htmlFor: t, className: "mb-1 block text-sm font-medium text-gray-700", children: "Select Provider" }), jsxs("select", { id: t, value: m, onChange: (x) => d(x.target.value), disabled: s, className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100", children: [jsx("option", { value: "", children: "Choose a provider..." }), Object.entries(X).map(([x, u]) => jsx("option", { value: x, children: u }, x))] })] }), b && jsxs("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800", children: [b, jsx("button", { type: "button", onClick: () => f(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), (i || C) && jsx(Ke, { editingOverride: C, defaultProvider: m, authRequired: h, writeBlocked: v, onWriteBlocked: () => w(true), onClose: () => {
    N(false), y(null);
  }, onSave: async () => {
    await A(), N(false), y(null);
  } }), h ? jsx("div", { className: "py-8 text-center text-gray-500", children: "Sign in to view and manage tenant template overrides." }) : m ? S ? jsx("div", { className: "py-8 text-center text-gray-500", children: "Loading overrides..." }) : a.length === 0 ? jsxs("div", { className: "py-8 text-center text-gray-500", children: ["No overrides for ", X[m] || m, ".", " ", jsx("button", { type: "button", onClick: () => N(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: l, children: "Create one" })] }) : jsx("div", { className: "space-y-3", children: a.map((x) => jsx(Je, { override: x, disabled: l, onEdit: () => y(x), onDelete: () => F(x.id) }, x.id)) }) : jsx("div", { className: "py-8 text-center text-gray-500", children: "Select a provider to view and manage template overrides" })] })] });
}
function Je({ override: t, disabled: a, onEdit: o, onDelete: S }) {
  const [g, b] = useState(false);
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-3", children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "min-w-0 flex-1", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("span", { className: "font-mono text-sm text-gray-900", children: t.templateKey }), t.appliesToDomains && t.appliesToDomains.length > 0 && jsxs("span", { className: "rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700", children: [t.appliesToDomains.length, " domain", t.appliesToDomains.length > 1 ? "s" : ""] })] }), jsxs("p", { className: "mt-1 text-xs text-gray-500", children: ["Created by ", t.createdBy, " on ", new Date(t.createdAt).toLocaleDateString()] })] }), jsxs("div", { className: "ml-2 flex items-center gap-1", children: [jsx("button", { type: "button", onClick: () => b(!g), className: "rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700", title: g ? "Collapse" : "Expand", children: jsx("svg", { "aria-hidden": "true", className: `h-4 w-4 transition-transform ${g ? "rotate-180" : ""}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }) }), jsx("button", { type: "button", onClick: o, disabled: a, className: "rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:text-gray-400 disabled:hover:bg-transparent", title: "Edit", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), jsx("button", { type: "button", onClick: S, disabled: a, className: "rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-400 disabled:hover:bg-transparent", title: "Delete", children: jsx("svg", { "aria-hidden": "true", className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] })] }), g && jsxs("div", { className: "mt-3 border-t border-gray-200 pt-3", children: [jsx("p", { className: "mb-1 text-xs font-medium text-gray-500", children: "Override Data:" }), jsx("pre", { className: "overflow-x-auto rounded border border-gray-200 bg-white p-2 text-xs text-gray-700", children: JSON.stringify(t.overrideData, null, 2) }), t.appliesToDomains && t.appliesToDomains.length > 0 && jsxs("div", { className: "mt-2", children: [jsx("p", { className: "mb-1 text-xs font-medium text-gray-500", children: "Applies to:" }), jsx("div", { className: "flex flex-wrap gap-1", children: t.appliesToDomains.map((f) => jsx("span", { className: "rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600", children: f }, f)) })] })] })] });
}
function Ke({ editingOverride: t, defaultProvider: a, authRequired: o, writeBlocked: S, onWriteBlocked: g, onClose: b, onSave: f }) {
  var _a;
  const h = useId(), k = `${h}-override-provider`, v = `${h}-override-template`, w = `${h}-override-data`, m = `${h}-override-domains`, [d, C] = useState((t == null ? void 0 : t.providerKey) || a), [y, i] = useState((t == null ? void 0 : t.templateKey) || ""), [N, A] = useState(t ? JSON.stringify(t.overrideData, null, 2) : "{}"), [F, s] = useState(((_a = t == null ? void 0 : t.appliesToDomains) == null ? void 0 : _a.join(", ")) || ""), [l, x] = useState(false), [u, E] = useState(null), _ = o || S;
  return jsx("div", { className: "mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4", children: jsxs("form", { onSubmit: async (I) => {
    if (I.preventDefault(), !d.trim() || !y.trim()) {
      E("Provider and template key are required");
      return;
    }
    let P;
    try {
      if (P = JSON.parse(N), typeof P != "object" || P === null) throw new Error("Must be an object");
    } catch {
      E("Override data must be valid JSON object");
      return;
    }
    x(true), E(null);
    try {
      const c = { providerKey: d.trim(), templateKey: y.trim(), overrideData: P, appliesToDomains: F.split(",").map((O) => O.trim()).filter(Boolean) }, L = t ? `/api/portfolio/templates/overrides/${t.id}` : "/api/portfolio/templates/overrides", $ = await fetch(L, { method: t ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
      if (!$.ok) {
        const O = await $.json().catch(() => ({}));
        throw $.status === 401 ? new Error("Operator sign-in is required to save overrides.") : $.status === 403 ? (g(), new Error("You do not have permission to save tenant overrides.")) : new Error(O.error || "Failed to save override");
      }
      await f();
    } catch (c) {
      E(c instanceof Error ? c.message : "Failed to save override");
    } finally {
      x(false);
    }
  }, children: [jsx("h4", { className: "mb-3 font-medium text-gray-900", children: t ? "Edit Override" : "New Override" }), u && jsx("div", { className: "mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800", children: u }), jsxs("div", { className: "space-y-3", children: [jsxs("div", { className: "grid grid-cols-2 gap-3", children: [jsxs("div", { children: [jsxs("label", { htmlFor: k, className: "mb-1 block text-sm font-medium text-gray-700", children: ["Provider Key ", jsx("span", { className: "text-red-500", children: "*" })] }), jsxs("select", { id: k, value: d, onChange: (I) => C(I.target.value), className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100", disabled: !!t || _, children: [jsx("option", { value: "", children: "Select..." }), Object.entries(X).map(([I, P]) => jsx("option", { value: I, children: P }, I))] })] }), jsxs("div", { children: [jsxs("label", { htmlFor: v, className: "mb-1 block text-sm font-medium text-gray-700", children: ["Template Key ", jsx("span", { className: "text-red-500", children: "*" })] }), jsx("input", { type: "text", id: v, value: y, onChange: (I) => i(I.target.value), placeholder: "e.g., dkim_record", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100", disabled: !!t || _ })] })] }), jsxs("div", { children: [jsxs("label", { htmlFor: w, className: "mb-1 block text-sm font-medium text-gray-700", children: ["Override Data (JSON) ", jsx("span", { className: "text-red-500", children: "*" })] }), jsx("textarea", { id: w, value: N, onChange: (I) => A(I.target.value), rows: 5, disabled: _, className: "w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100", placeholder: '{"key": "value"}' })] }), jsxs("div", { children: [jsx("label", { htmlFor: m, className: "mb-1 block text-sm font-medium text-gray-700", children: "Applies to Domains (comma-separated, leave empty for all)" }), jsx("input", { type: "text", id: m, value: F, onChange: (I) => s(I.target.value), placeholder: "example.com, test.com", className: "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100", disabled: _ })] })] }), jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: b, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: l || o, children: "Cancel" }), jsx("button", { type: "submit", disabled: l || _ || !d.trim() || !y.trim(), className: "rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: l ? "Saving..." : t ? "Update" : "Create" })] })] }) });
}
const et = function() {
  const [a, o] = useState(le);
  return jsxs("div", { className: "mx-auto max-w-7xl space-y-6", children: [jsxs("div", { className: "rounded-2xl border border-blue-200 bg-blue-50 p-8 shadow-sm", children: [jsx("p", { className: "text-sm font-semibold uppercase tracking-wide text-blue-700", children: "Operator workspace" }), jsx("h1", { className: "mt-2 text-3xl font-bold text-gray-900", children: "Portfolio workflows" }), jsx("p", { className: "mt-4 text-gray-700", children: "This route now exposes the supported operator surface for monitoring, alert triage, fleet reporting, saved filters, shared reports, and tenant governance workflows." }), jsx("div", { className: "mt-6 flex flex-wrap gap-3", children: jsx(Link, { to: "/", className: "focus-ring inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700", children: "Return to Home" }) })] }), jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]", children: [jsx(Re, { currentFilters: a, onFiltersChange: o }), jsx(qe, { currentFilters: a, onLoadFilter: o })] }), jsx(Fe, {}), jsx(we, {}), jsx(Ve, {}), jsx(Ae, {}), jsx(Ye, {}), jsx(Se, {}), jsx("div", { className: "rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600", children: "Mail diagnostics and remediation requests are available from the Domain 360 mail tab. Domain notes and tags now live on the Domain 360 overview surface. Saved filters now drive the portfolio search workspace directly." })] });
};

export { et as component };
//# sourceMappingURL=portfolio-BOrQ6SEm.mjs.map
