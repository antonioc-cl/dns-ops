import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useState, useId, useCallback, useEffect } from 'react';
import { u, p, x } from './StateDisplay-DMFHryPA.mjs';
import { aE as ve$1, aF as xe, aG as Mt } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:async_hooks';
import 'vinxi/lib/invariant';
import 'vinxi/lib/path';
import 'node:url';
import '@tanstack/router-core';
import 'hono';
import 'better-result';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import 'hono/factory';
import 'drizzle-orm/d1';
import 'drizzle-orm/node-postgres';
import 'events';
import 'util';
import 'crypto';
import 'dns';
import 'fs';
import 'net';
import 'tls';
import 'path';
import 'stream';
import 'string_decoder';
import 'node:fs/promises';
import '@node-rs/argon2';
import '@tanstack/react-router';
import 'react-dom';
import '@tanstack/history';
import 'node:stream';
import 'react-dom/server';
import 'node:stream/web';

function Ne(t) {
  return t == null ? "UNKNOWN" : { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED", 6: "YXDOMAIN", 7: "YXRRSET", 8: "NXRRSET", 9: "NOTAUTH", 10: "NOTZONE" }[t] || `RCODE_${t}`;
}
function ve(t) {
  if (!t) return "";
  const a = [];
  return t.authoritative && a.push("aa"), t.truncated && a.push("tc"), t.recursionDesired && a.push("rd"), t.recursionAvailable && a.push("ra"), t.authenticated && a.push("ad"), t.checkingDisabled && a.push("cd"), a.join(" ");
}
function ee(t) {
  const a = t.name.endsWith(".") ? t.name : `${t.name}.`;
  if (t.type === "MX" && t.priority !== void 0) return `${a}	${t.ttl}	IN	${t.type}	${t.priority}	${t.data}`;
  if (t.type === "SOA") {
    const s = t.data.split(" ");
    return `${a}	${t.ttl}	IN	${t.type}	${s.join("	")}`;
  }
  return `${a}	${t.ttl}	IN	${t.type}	${t.data}`;
}
function we(t, a = {}) {
  var _a, _b, _c;
  const { showComments: s = true, showQuestion: n = true } = a, o = [];
  s && (o.push(`; <<>> DNS Ops Workbench <<>> ${t.queryName} ${t.queryType}`), o.push("; (1 server found)"), o.push(";; global options: +cmd"), o.push(";; Got answer:"));
  const l = Ne(t.responseCode), d = ve(t.flags), u = ((_a = t.answerSection) == null ? void 0 : _a.length) || 0, i = ((_b = t.authoritySection) == null ? void 0 : _b.length) || 0, p = ((_c = t.additionalSection) == null ? void 0 : _c.length) || 0;
  if (o.push(`;; ->>HEADER<<- opcode: QUERY, status: ${l}, id: ${t.id.slice(0, 4)}`), o.push(`;; flags: ${d}; QUERY: 1, ANSWER: ${u}, AUTHORITY: ${i}, ADDITIONAL: ${p}`), n) {
    o.push(""), o.push(";; QUESTION SECTION:");
    const h = t.queryName.endsWith(".") ? t.queryName : `${t.queryName}.`;
    o.push(`;${h}		IN	${t.queryType}`);
  }
  if (u > 0) {
    o.push(""), o.push(";; ANSWER SECTION:");
    for (const h of t.answerSection || []) o.push(ee(h));
  }
  if (i > 0) {
    o.push(""), o.push(";; AUTHORITY SECTION:");
    for (const h of t.authoritySection || []) o.push(ee(h));
  }
  if (p > 0) {
    o.push(""), o.push(";; ADDITIONAL SECTION:");
    for (const h of t.additionalSection || []) o.push(ee(h));
  }
  return o.push(""), o.push(`;; Query time: ${t.responseTimeMs || 0} msec`), o.push(`;; SERVER: ${t.vantageIdentifier || t.vantageType}#53`), o.push(`;; WHEN: ${new Date(t.queriedAt).toString()}`), o.push(`;; MSG SIZE rcvd: ${Ce(t)}`), o.join(`
`);
}
function Se(t, a) {
  return t.map((s) => we(s, a)).join(`

; ========================================

`);
}
function Ce(t) {
  let a = 12;
  a += t.queryName.length + 4;
  for (const s of t.answerSection || []) a += s.name.length + s.data.length + 12;
  for (const s of t.authoritySection || []) a += s.name.length + s.data.length + 12;
  for (const s of t.additionalSection || []) a += s.name.length + s.data.length + 12;
  return a;
}
function ke(t) {
  var _a;
  const a = /* @__PURE__ */ new Map();
  for (const s of t) {
    const n = `${s.queryName.toLowerCase()}|${s.queryType}`;
    a.has(n) || a.set(n, []), (_a = a.get(n)) == null ? void 0 : _a.push(s);
  }
  return a;
}
function $e(t) {
  const a = [];
  for (const s of t) s.type === "MX" && s.priority !== void 0 ? a.push(`${s.priority} ${s.data}`) : a.push(s.data);
  return [...new Set(a)];
}
function Ee(t, a) {
  if (t.length !== a.length) return false;
  const s = [...t].sort(), n = [...a].sort();
  return s.every((o, l) => o === n[l]);
}
function De(t) {
  const a = ke(t), s = [];
  for (const [n, o] of a) {
    const [l, d] = n.split("|"), u = o.filter((m) => m.status === "success"), i = o.filter((m) => m.status !== "success"), p = [], h = [], k = [], w = /* @__PURE__ */ new Map();
    for (const m of u) {
      const b = m.vantageIdentifier || m.vantageType;
      h.push(b), k.push(m.id);
      const $ = $e(m.answerSection || []);
      p.push(...$), w.set(b, $);
    }
    for (const m of i) {
      const b = m.vantageIdentifier || m.vantageType;
      h.push(`${b} (${m.status})`), k.push(m.id);
    }
    const x = [...new Set(p)];
    let D = true;
    const f = [];
    if (w.size > 1) {
      const m = w.values().next();
      if (m.value) {
        const b = m.value;
        for (const [, $] of w) if (!Ee(b, $)) {
          D = false, f.push("Values differ across vantages");
          break;
        }
      }
    }
    if (i.length > 0) {
      const m = [...new Set(i.map((b) => b.status))];
      f.push(`Failures from ${i.length} vantage(s): ${m.join(", ")}`), D = false;
    }
    const y = u.flatMap((m) => (m.answerSection || []).map((b) => b.ttl)).filter((m) => m !== void 0), S = y.length > 0 ? Math.round(y.reduce((m, b) => m + b, 0) / y.length) : 0;
    s.push({ name: l, type: d, ttl: S, values: x, sourceVantages: [...new Set(h)], sourceObservationIds: k, isConsistent: D, consolidationNotes: f.length > 0 ? f.join("; ") : void 0 });
  }
  return s;
}
function Re(t) {
  var _a;
  const a = /* @__PURE__ */ new Map();
  for (const o of t) a.has(o.type) || a.set(o.type, []), (_a = a.get(o.type)) == null ? void 0 : _a.push(o);
  const s = ["SOA", "NS", "A", "AAAA", "CNAME", "MX", "TXT", "CAA"], n = /* @__PURE__ */ new Map();
  for (const o of s) {
    const l = a.get(o);
    l && n.set(o, l);
  }
  for (const [o, l] of a) n.has(o) || n.set(o, l);
  return n;
}
function Te(t, a) {
  switch (t) {
    case "MX": {
      const s = a.match(/^(\d+)\s+(.+)$/);
      return s ? `${s[2]} (priority: ${s[1]})` : a;
    }
    case "SOA": {
      const s = a.split(" ");
      return s.length >= 2 ? `Primary: ${s[0]}, Contact: ${s[1]}` : a;
    }
    case "TXT":
      return a.replace(/^"/, "").replace(/"$/, "");
    default:
      return a;
  }
}
function Ae(t) {
  return { A: "IPv4 Address", AAAA: "IPv6 Address", CNAME: "Canonical Name", MX: "Mail Exchange", NS: "Name Server", SOA: "Start of Authority", TXT: "Text", CAA: "Certification Authority Authorization", PTR: "Pointer", SRV: "Service" }[t] || t;
}
async function Ie(t) {
  const [a, s] = await Promise.all([fetch(`/api/snapshot/${t}/delegation`, { credentials: "include" }), fetch(`/api/snapshot/${t}/delegation/issues`, { credentials: "include" })]);
  if (!a.ok) throw new Error(`Failed to load delegation: ${a.status} ${a.statusText}`);
  if (!s.ok) throw new Error(`Failed to load delegation issues: ${s.status} ${s.statusText}`);
  const [n, o] = await Promise.all([a.json(), s.json()]);
  return { delegation: n.delegation || null, issues: o.issues || [] };
}
function Fe({ snapshotId: t }) {
  const [a, s] = useState(null), { data: n, isLoading: o, error: l } = useQuery({ queryKey: ["delegation", t], queryFn: () => Ie(t), enabled: !!t });
  if (!t) return jsx("div", { "data-testid": "delegation-no-snapshot-state", children: jsx(x, { icon: "globe", title: "No delegation data available", description: "Collect a DNS snapshot to view delegation analysis.", size: "sm" }) });
  if (o) return jsx("div", { "data-testid": "delegation-loading-state", children: jsx(u, { message: "Loading delegation data..." }) });
  if (l) return jsx("div", { "data-testid": "delegation-error-state", children: jsx(p, { message: l.message }) });
  if (!(n == null ? void 0 : n.delegation)) return jsx("div", { "data-testid": "delegation-no-data-state", children: jsx(x, { icon: "globe", title: "No delegation data available", description: "Delegation collection may not have been enabled for this snapshot." }) });
  const { delegation: d, issues: u$1 } = n;
  return jsxs("div", { className: "space-y-6", "data-testid": "delegation-panel", children: [u$1.length > 0 && jsx("div", { className: "space-y-3", children: u$1.map((i) => jsx(Me, { issue: i, isExpanded: a === `${i.type}-${i.severity}-${i.description}`, onToggle: () => s(a === `${i.type}-${i.severity}-${i.description}` ? null : `${i.type}-${i.severity}-${i.description}`) }, `${i.type}-${i.severity}-${i.description}`)) }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Parent Zone Delegation" }), jsx("div", { className: "bg-gray-50 rounded-lg p-4", children: jsxs("div", { className: "grid grid-cols-2 gap-4", children: [jsxs("div", { children: [jsx("span", { className: "text-sm text-gray-500", children: "Domain" }), jsx("p", { className: "font-mono text-sm", children: d.domain })] }), jsxs("div", { children: [jsx("span", { className: "text-sm text-gray-500", children: "Parent Zone" }), jsx("p", { className: "font-mono text-sm", children: d.parentZone })] })] }) })] }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Name Servers" }), jsx("div", { className: "space-y-2", children: d.nameServers.length > 0 ? d.nameServers.map((i) => jsxs("div", { className: "flex items-center justify-between p-3 bg-white border rounded-lg", children: [jsx("code", { className: "font-mono text-sm", children: i.name }), jsxs("span", { className: "text-xs text-gray-500", children: ["via ", i.source] })] }, `${i.name}-${i.source}`)) : jsx("p", { className: "text-sm text-gray-500", children: "No name servers found" }) })] }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Glue Records" }), d.glue.length > 0 ? jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: d.glue.map((i) => jsxs("div", { className: "p-3 bg-white border rounded-lg", children: [jsx("div", { className: "font-mono text-sm", children: i.name }), jsxs("div", { className: "flex items-center gap-2 mt-1", children: [jsx("span", { className: `text-xs px-2 py-0.5 rounded ${i.type === "A" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`, children: i.type }), jsx("code", { className: "text-sm text-gray-600", children: i.address })] })] }, `${i.name}-${i.type}-${i.address}`)) }) : jsx("p", { className: "text-sm text-gray-500", children: "No glue records found" })] }), jsxs("section", { className: "flex items-center gap-3 pt-4 border-t", children: [jsx(de, { label: "DNSSEC", status: d.hasDnssec ? "present" : "absent", color: d.hasDnssec ? "green" : "gray" }), jsx(de, { label: "Divergence", status: d.hasDivergence ? "detected" : "none", color: d.hasDivergence ? "red" : "green" })] })] });
}
function Me({ issue: t, isExpanded: a, onToggle: s }) {
  var _a, _b;
  const n = t.evidence && t.evidence.length > 0, o = { critical: { bg: "bg-red-50 border-red-200", dot: "bg-red-500" }, high: { bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" }, medium: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" }, low: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" } }, l = o[t.severity] || o.medium;
  return jsxs("div", { className: `rounded-lg border ${l.bg}`, children: [jsx("div", { className: "p-4", children: jsxs("div", { className: "flex items-start gap-3", children: [jsx("div", { className: `w-2 h-2 rounded-full mt-2 ${l.dot}` }), jsxs("div", { className: "flex-1", children: [jsx("h4", { className: "font-medium text-gray-900", children: t.description }), jsxs("p", { className: "text-sm text-gray-600 mt-1 capitalize", children: [t.type.replace(/-/g, " "), " \u2022 ", t.severity, " severity"] })] }), n && jsxs("button", { type: "button", onClick: s, className: "text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1", children: [jsx("svg", { "aria-hidden": "true", className: `w-4 h-4 transition-transform ${a ? "rotate-180" : ""}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }), "Evidence"] })] }) }), a && n && jsxs("div", { className: "border-t border-gray-200 bg-white/50 p-4", children: [jsxs("h5", { className: "text-xs font-medium text-gray-500 uppercase mb-3", children: ["Observation Evidence (", (_a = t.evidence) == null ? void 0 : _a.length, ")"] }), jsx("div", { className: "space-y-3", children: (_b = t.evidence) == null ? void 0 : _b.map((d) => jsx(Pe, { evidence: d }, `${d.queryName}-${d.queryType}-${d.source}-${d.status}`)) })] })] });
}
function Pe({ evidence: t }) {
  const [a, s] = useState(false), n = { success: "bg-green-100 text-green-700", error: "bg-red-100 text-red-700", timeout: "bg-yellow-100 text-yellow-700", nodata: "bg-gray-100 text-gray-600" };
  return jsxs("div", { className: "p-3 bg-white rounded border border-gray-200", children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("code", { className: "text-sm font-mono text-gray-900", children: t.queryName }), jsx("span", { className: "px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium", children: t.queryType }), jsx("span", { className: `px-1.5 py-0.5 text-xs rounded font-medium ${n[t.status] || "bg-gray-100 text-gray-600"}`, children: t.status })] }), jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Source: ", jsx("span", { className: "font-medium", children: t.source })] })] }), t.data && jsx("button", { type: "button", onClick: () => s(!a), className: "text-xs text-blue-600 hover:text-blue-700 ml-2", children: a ? "Hide" : "Raw" })] }), a && t.data && jsx("div", { className: "mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto", children: jsx("pre", { className: "text-gray-100 font-mono whitespace-pre-wrap", children: JSON.stringify(t.data, null, 2) }) })] });
}
function de({ label: t, status: a, color: s }) {
  return jsxs("div", { className: `px-3 py-1.5 rounded-lg text-sm ${{ green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800", gray: "bg-gray-100 text-gray-800" }[s]}`, children: [jsxs("span", { className: "font-medium", children: [t, ":"] }), " ", jsx("span", { className: "capitalize", children: a })] });
}
function Le({ snapshotId: t }) {
  const { data: a = [], isLoading: s, error: n } = useQuery({ queryKey: ["selectors", t], queryFn: async () => {
    var _a;
    return (_a = (await (await fetch(`/api/snapshot/${t}/selectors`)).json()).selectors) != null ? _a : [];
  }, enabled: !!t });
  return s ? jsx(u, { message: "Discovering DKIM selectors...", size: "sm" }) : n ? jsx(p, { message: n.message, size: "sm" }) : a.length === 0 ? jsxs("div", { className: "text-sm text-gray-500", children: [jsx("p", { children: "No DKIM selectors discovered yet." }), jsx("p", { className: "mt-1", children: "This may indicate:" }), jsxs("ul", { className: "list-disc ml-5 mt-1", children: [jsx("li", { children: "No DKIM configured for this domain" }), jsx("li", { children: "Selectors use non-standard names" }), jsx("li", { children: "Provider not in detection database" })] })] }) : jsxs("div", { className: "space-y-3", children: [a.map((o) => jsxs("div", { className: `p-3 rounded-lg border ${o.found ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`, children: [jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsxs("code", { className: "text-sm font-mono font-medium", children: [o.selector, "._domainkey"] }), o.found && jsx("span", { className: "text-green-600", children: jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", "aria-hidden": "true", focusable: "false", children: jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }) })] }), jsx(qe, { confidence: o.confidence })] }), jsxs("div", { className: "mt-2 text-xs text-gray-600", children: [jsx("span", { className: "font-medium", children: "Source:" }), " ", Oe(o.provenance), o.provider && jsxs("span", { className: "ml-2 text-blue-600", children: ["(", o.provider, ")"] })] })] }, o.selector)), jsx("p", { className: "text-xs text-gray-500 mt-3", children: "Selectors discovered using a 5-level precedence strategy (managed config \u2192 operator supplied \u2192 provider heuristic \u2192 common dictionary \u2192 not found)." })] });
}
function qe({ confidence: t }) {
  const a = { certain: "bg-green-100 text-green-800", high: "bg-blue-100 text-blue-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-orange-100 text-orange-800", heuristic: "bg-gray-100 text-gray-600" };
  return jsx("span", { className: `px-2 py-0.5 rounded text-xs font-medium ${a[t] || a.heuristic}`, children: t });
}
function Oe(t) {
  return { "managed-zone-config": "Managed zone configuration", "operator-supplied": "Operator supplied", "provider-heuristic": "Provider heuristic detection", "common-dictionary": "Common selector dictionary", "not-found": "Not found" }[t] || t;
}
const q = [{ id: "parsed", label: "Parsed", description: "Structured record view" }, { id: "raw", label: "Raw", description: "Complete response data" }, { id: "dig", label: "Dig", description: "CLI-style output" }];
function je({ observations: t }) {
  const [a, s] = useState("parsed"), n = useId(), o = (i) => `${n}-dns-view-tab-${i}`, l = (i) => `${n}-dns-view-panel-${i}`, d = (i) => {
    requestAnimationFrame(() => {
      var _a;
      (_a = document.getElementById(o(i))) == null ? void 0 : _a.focus();
    });
  };
  return jsxs("div", { children: [jsx(Be, { current: a, onChange: s, onKeyDown: (i, p) => {
    if (i.key === "ArrowRight") {
      i.preventDefault();
      const h = q[(p + 1) % q.length];
      s(h.id), d(h.id);
      return;
    }
    if (i.key === "ArrowLeft") {
      i.preventDefault();
      const h = (p - 1 + q.length) % q.length, k = q[h];
      s(k.id), d(k.id);
      return;
    }
    if (i.key === "Home") {
      i.preventDefault();
      const h = q[0];
      s(h.id), d(h.id);
      return;
    }
    if (i.key === "End") {
      i.preventDefault();
      const h = q[q.length - 1];
      s(h.id), d(h.id);
    }
  }, getTabId: o, getPanelId: l }), jsxs("div", { className: "mt-4", children: [jsx("div", { role: "tabpanel", id: l("parsed"), "aria-labelledby": o("parsed"), hidden: a !== "parsed", children: a === "parsed" && jsx(ze, { observations: t }) }), jsx("div", { role: "tabpanel", id: l("raw"), "aria-labelledby": o("raw"), hidden: a !== "raw", children: a === "raw" && jsx(Ke, { observations: t }) }), jsx("div", { role: "tabpanel", id: l("dig"), "aria-labelledby": o("dig"), hidden: a !== "dig", children: a === "dig" && jsx(Ue, { observations: t }) })] })] });
}
function Be({ current: t, onChange: a, onKeyDown: s, getTabId: n, getPanelId: o }) {
  return jsx("div", { className: "rounded-lg bg-gray-100 p-1", role: "tablist", "aria-label": "DNS view mode", children: jsx("div", { className: "flex space-x-1", children: q.map((l, d) => jsx("button", { type: "button", id: n(l.id), role: "tab", "aria-selected": t === l.id, "aria-controls": o(l.id), tabIndex: t === l.id ? 0 : -1, onClick: () => a(l.id), onKeyDown: (u) => s(u, d), className: `focus-ring flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${t === l.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`, title: l.description, children: l.label }, l.id)) }) });
}
function ze({ observations: t }) {
  const a = De(t), s = Re(a);
  return a.length === 0 ? jsx("div", { className: "text-center py-8 text-gray-500", children: "No successful observations to display" }) : jsx("div", { className: "space-y-6", children: Array.from(s.entries()).map(([n, o]) => jsxs("section", { className: "border rounded-lg overflow-hidden", children: [jsx("div", { className: "bg-gray-50 px-4 py-2 border-b", children: jsxs("h4", { className: "font-semibold text-gray-900", children: [n, " Records", jsxs("span", { className: "ml-2 text-sm font-normal text-gray-500", children: ["(", o.length, ") \xB7 ", Ae(n)] })] }) }), jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [jsx("thead", { className: "bg-gray-50", children: jsxs("tr", { children: [jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Name" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "TTL" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Value" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Sources" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Status" })] }) }), jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: o.map((l) => jsxs("tr", { children: [jsx("td", { className: "px-4 py-2 text-sm font-mono text-gray-900", children: l.name }), jsx("td", { className: "px-4 py-2 text-sm text-gray-600 tabular-nums", children: l.ttl !== null && l.ttl !== void 0 ? `${l.ttl}s` : "\u2014" }), jsx("td", { className: "px-4 py-2 text-sm", children: jsx("div", { className: "space-y-1", children: l.values.map((d) => {
    const u = typeof d == "string" ? d : JSON.stringify(d);
    return jsx("div", { className: "font-mono text-gray-800", children: Te(l.type, d) }, `${l.name}-${l.type}-${u}`);
  }) }) }), jsx("td", { className: "px-4 py-2 text-sm text-gray-600", children: l.sourceVantages.join(", ") }), jsx("td", { className: "px-4 py-2", children: l.isConsistent ? jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800", children: "Consistent" }) : jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800", title: l.consolidationNotes, children: "Divergent" }) })] }, `${l.name}-${l.type}-${l.values.join(",")}`)) })] }) })] }, n)) });
}
function Ke({ observations: t }) {
  return jsx("div", { className: "space-y-4", children: t.map((a) => {
    var _a;
    return jsxs("details", { className: "border rounded-lg overflow-hidden", open: a.status !== "success", children: [jsx("summary", { className: "bg-gray-50 px-4 py-2 cursor-pointer hover:bg-gray-100", children: jsxs("div", { className: "flex items-center justify-between", children: [jsxs("span", { className: "font-medium", children: [a.queryName, " ", a.queryType, jsxs("span", { className: "ml-2 text-sm text-gray-500", children: ["from ", a.vantageIdentifier || a.vantageType] })] }), jsx(Ve, { status: a.status })] }) }), jsxs("div", { className: "px-4 py-3 space-y-3", children: [jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Response Code:" }), " ", jsx("span", { className: "font-mono", children: (_a = a.responseCode) != null ? _a : "N/A" })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Response Time:" }), " ", jsxs("span", { className: "tabular-nums", children: [a.responseTimeMs, "ms"] })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Queried At:" }), " ", jsx("span", { children: new Date(a.queriedAt).toLocaleString() })] })] }), !!a.flags && jsxs("div", { children: [jsx("span", { className: "text-gray-500 text-sm", children: "Flags:" }), jsx("pre", { className: "mt-1 text-xs bg-gray-50 p-2 rounded", children: JSON.stringify(a.flags, null, 2) })] }), jsx(te, { title: "Answer Section", data: a.answerSection }), jsx(te, { title: "Authority Section", data: a.authoritySection }), jsx(te, { title: "Additional Section", data: a.additionalSection }), a.errorMessage && jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-3", children: [jsx("span", { className: "text-red-800 font-medium", children: "Error:" }), jsx("pre", { className: "mt-1 text-sm text-red-700", children: a.errorMessage })] }), a.rawResponse && jsxs("div", { children: [jsx("span", { className: "text-gray-500 text-sm", children: "Raw Response:" }), jsx("pre", { className: "mt-1 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto", children: a.rawResponse })] })] })] }, a.id);
  }) });
}
function te({ title: t, data: a }) {
  return !a || Array.isArray(a) && a.length === 0 ? null : jsxs("div", { children: [jsxs("span", { className: "text-gray-500 text-sm", children: [t, ":"] }), jsx("pre", { className: "mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto", children: JSON.stringify(a, null, 2) })] });
}
function Ve({ status: t }) {
  const a = { success: { color: "bg-green-100 text-green-800", label: "Success" }, timeout: { color: "bg-yellow-100 text-yellow-800", label: "Timeout" }, refused: { color: "bg-orange-100 text-orange-800", label: "Refused" }, nxdomain: { color: "bg-red-100 text-red-800", label: "NXDOMAIN" }, nodata: { color: "bg-yellow-100 text-yellow-800", label: "NODATA" }, error: { color: "bg-red-100 text-red-800", label: "Error" }, truncated: { color: "bg-yellow-100 text-yellow-800", label: "Truncated" } }, { color: s, label: n } = a[t] || { color: "bg-gray-100 text-gray-800", label: t };
  return jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s}`, children: n });
}
function Ue({ observations: t }) {
  const [a, s] = useState(false), n = a ? t : t.slice(0, 5), o = t.length > 5;
  return jsxs("div", { children: [jsx("div", { className: "bg-gray-900 text-gray-100 rounded-lg overflow-hidden", children: jsx("div", { className: "p-4 font-mono text-sm whitespace-pre overflow-x-auto", children: String(Se(n)) }) }), o && !a && jsxs("button", { type: "button", onClick: () => s(true), className: "focus-ring mt-2 text-sm text-blue-600 hover:text-blue-800", children: ["Show all ", t.length, " observations..."] })] });
}
function We({ isOpen: t, title: a, message: s, confirmLabel: n = "Confirm", cancelLabel: o = "Cancel", variant: l = "danger", onConfirm: d, onCancel: u }) {
  const i = useId(), p = useId();
  return t ? jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", onKeyDown: (w) => {
    w.key === "Escape" && u();
  }, role: "dialog", "aria-modal": "true", "aria-labelledby": i, "aria-describedby": p, tabIndex: -1, children: [jsx("button", { type: "button", className: "absolute inset-0 w-full h-full bg-transparent", onClick: u, "aria-label": "Close dialog" }), jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden", role: "document", children: [jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: jsx("h3", { id: i, className: `text-lg font-semibold ${l === "danger" ? "text-red-700" : "text-amber-700"}`, children: a }) }), jsx("div", { className: "px-6 py-4", id: p, children: jsx("div", { className: "text-gray-700", children: s }) }), jsxs("div", { className: "px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3", children: [jsx("button", { type: "button", onClick: u, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: o }), jsx("button", { type: "button", onClick: d, className: `px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${l === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}`, children: n })] })] })] }) : null;
}
async function Qe(t) {
  const a = await fetch(`/api/snapshot/${t}/findings/mail`, { credentials: "include" });
  if (!a.ok) throw new Error("Failed to fetch mail findings");
  return await a.json();
}
function He({ snapshotId: t }) {
  const { data: a, isLoading: s, error: n } = useQuery({ queryKey: ["mail-findings", t], queryFn: () => Qe(t), enabled: !!t });
  if (!t) return jsx(x, { icon: "inbox", title: "No snapshot available", description: "Collect data to analyze mail configuration.", size: "sm" });
  if (s) return jsx(u, { message: "Analyzing mail configuration...", size: "sm" });
  if (n) return jsx(p, { message: n.message, size: "sm" });
  if (!a) return null;
  const { mailConfig: o, findings: l, suggestions: d } = a, u$1 = Xe(l);
  return jsxs("div", { className: "space-y-6", children: [jsx("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100", children: jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Mail Security Score" }), jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Based on SPF, DMARC, DKIM, MTA-STS, and TLS-RPT configuration" })] }), jsx("div", { className: "flex items-center gap-2", children: jsx(_e, { score: o.securityScore }) })] }) }), jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3", children: [jsx(z, { name: "MX", present: o.hasMx }), jsx(z, { name: "SPF", present: o.hasSpf }), jsx(z, { name: "DMARC", present: o.hasDmarc }), jsx(z, { name: "DKIM", present: o.hasDkim }), jsx(z, { name: "MTA-STS", present: o.hasMtaSts, optional: true }), jsx(z, { name: "TLS-RPT", present: o.hasTlsRpt, optional: true })] }), (o.issues.length > 0 || o.recommendations.length > 0) && jsxs("div", { className: "space-y-3", children: [o.issues.length > 0 && jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: [jsx("h5", { className: "text-sm font-medium text-red-800 mb-2", children: "Issues" }), jsx("ul", { className: "space-y-1", children: o.issues.map((i) => jsxs("li", { className: "text-sm text-red-700 flex items-start gap-2", children: [jsx("span", { className: "text-red-500 mt-0.5", children: "\xD7" }), i] }, i)) })] }), o.recommendations.length > 0 && jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3", children: [jsx("h5", { className: "text-sm font-medium text-amber-800 mb-2", children: "Recommendations" }), jsx("ul", { className: "space-y-1", children: o.recommendations.map((i) => jsxs("li", { className: "text-sm text-amber-700 flex items-start gap-2", children: [jsx("span", { className: "text-amber-500 mt-0.5", children: "\u2192" }), i] }, i)) })] })] }), jsxs("div", { className: "border-t pt-4", children: [jsxs("div", { className: "flex items-center justify-between mb-4", children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Mail Findings" }), l.length > 0 && jsxs("span", { className: "text-sm text-gray-500", children: [l.length, " finding", l.length !== 1 ? "s" : ""] })] }), l.length === 0 && jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: jsx("p", { className: "text-green-800 text-sm", children: "\u2713 No mail configuration issues detected." }) }), ["critical", "high", "medium", "low", "info"].map((i) => {
    const p = u$1[i];
    return !p || p.length === 0 ? null : jsxs("div", { className: "space-y-2 mb-4", children: [jsxs("h5", { className: "text-sm font-medium text-gray-700 capitalize", children: [i, " (", p.length, ")"] }), p.map((h) => jsx(Je, { finding: h, domain: a.domain, suggestions: d.filter((k) => k.findingId === h.id) }, h.id))] }, i);
  })] }), jsxs("div", { className: "text-xs text-gray-400 pt-2 border-t", children: ["Ruleset v", a.rulesetVersion, " \xB7 ", a.persisted ? "Persisted" : "Live", " evaluation"] })] });
}
function _e({ score: t }) {
  return jsx("div", { className: `w-16 h-16 rounded-full border-4 flex items-center justify-center ${t >= 80 ? "text-green-600 border-green-500" : t >= 60 ? "text-yellow-600 border-yellow-500" : t >= 40 ? "text-orange-600 border-orange-500" : "text-red-600 border-red-500"}`, children: jsx("span", { className: "text-xl font-bold", children: t }) });
}
function z({ name: t, present: a, optional: s = false }) {
  return jsxs("div", { className: `flex items-center gap-2 p-3 rounded-lg border ${a ? "bg-green-50 border-green-200" : s ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`, children: [jsx("span", { className: `w-5 h-5 rounded-full flex items-center justify-center text-xs ${a ? "bg-green-500 text-white" : s ? "bg-gray-300 text-gray-600" : "bg-red-500 text-white"}`, children: a ? "\u2713" : s ? "\u2212" : "\xD7" }), jsx("span", { className: `text-sm font-medium ${a ? "text-green-800" : "text-gray-700"}`, children: t })] });
}
function Je({ finding: t, domain: a, suggestions: s }) {
  const [n, o] = useState(false), l = { critical: "bg-red-600", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500", info: "bg-gray-400" };
  return jsxs("div", { className: `border rounded-lg overflow-hidden ${t.reviewOnly ? "border-amber-300 bg-amber-50" : "border-gray-200"}`, children: [jsx("button", { type: "button", onClick: () => o(!n), "aria-expanded": n, className: "focus-ring w-full px-4 py-3 text-left hover:bg-black/5 transition-colors duration-150", children: jsxs("div", { className: "flex items-start gap-3", children: [jsx("span", { className: `flex-shrink-0 w-2 h-2 rounded-full mt-2 ${l[t.severity] || "bg-gray-400"}`, "aria-hidden": "true" }), jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("h5", { className: "font-medium text-gray-900", children: t.title }), t.reviewOnly && jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800", children: "Review Required" })] }), jsx("p", { className: "text-sm text-gray-600 mt-1 line-clamp-2", children: t.description }), jsxs("div", { className: "flex items-center gap-3 mt-2 text-xs text-gray-500", children: [jsxs("span", { className: "capitalize", children: [t.confidence, " confidence"] }), s.length > 0 && jsxs("span", { children: [s.length, " suggestion(s)"] })] })] }), jsx("svg", { className: `w-5 h-5 text-gray-400 transition-transform duration-150 ${n ? "rotate-180" : ""}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }) }), n && jsxs("div", { className: "px-4 pb-4 border-t border-gray-200/50 bg-white", children: [t.evidence && t.evidence.length > 0 && jsxs("div", { className: "mt-3", children: [jsx("h6", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2", children: "Evidence" }), jsx("ul", { className: "space-y-1", children: t.evidence.map((d) => jsxs("li", { className: "text-sm text-gray-600", children: ["\u2022 ", d.description] }, d.description)) })] }), s.length > 0 && jsxs("div", { className: "mt-4 space-y-3", children: [jsx("h6", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider", children: "Suggestions" }), s.map((d) => jsx(Ye, { suggestion: d, domain: a }, d.id))] }), jsxs("div", { className: "mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400", children: ["Rule: ", t.ruleId, " \xB7 Version: ", t.ruleVersion] })] })] });
}
function Xe(t) {
  return t.reduce((a, s) => {
    const n = s.severity;
    return a[n] || (a[n] = []), a[n].push(s), a;
  }, {});
}
function Ye({ suggestion: t, domain: a }) {
  const s = useQueryClient(), [n, o] = useState(false), l = !t.appliedAt && !t.dismissedAt, d = useMutation({ mutationFn: async () => {
    const h = await fetch(`/api/suggestions/${t.id}/apply`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmApply: t.reviewOnly ? true : void 0 }) });
    if (!h.ok) {
      const k = await h.json();
      throw new Error(k.error || "Failed to apply suggestion");
    }
  }, onSuccess: () => {
    s.invalidateQueries({ queryKey: ["mail-findings"] });
  } }), u = useMutation({ mutationFn: async () => {
    if (!(await fetch(`/api/suggestions/${t.id}/dismiss`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Dismissed by user" }) })).ok) throw new Error("Failed to dismiss suggestion");
  }, onSuccess: () => {
    s.invalidateQueries({ queryKey: ["mail-findings"] });
  } }), i = () => {
    if (t.reviewOnly && !n) {
      o(true);
      return;
    }
    d.mutate();
  }, p = () => {
    u.mutate();
  };
  return jsxs(Fragment, { children: [jsxs("div", { className: `p-3 rounded-lg ${t.reviewOnly ? "bg-amber-100/50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`, children: [jsx("div", { className: "flex items-start justify-between gap-3", children: jsxs("div", { className: "flex-1", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("h6", { className: "font-medium text-gray-900", children: t.title }), t.reviewOnly && jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800", children: "\u26A0\uFE0F Review Required" })] }), jsx("p", { className: "text-sm text-gray-600 mt-1", children: t.description }), jsx("div", { className: "mt-2 p-2 bg-white/50 rounded text-sm font-mono text-gray-700 whitespace-pre-wrap", children: t.action })] }) }), l && jsxs("div", { className: "mt-3 flex items-center gap-2 pt-2 border-t border-gray-200/50", children: [jsx("button", { type: "button", onClick: i, disabled: d.isPending || u.isPending, className: "inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: d.isPending ? "Applying..." : "Apply" }), jsx("button", { type: "button", onClick: p, disabled: d.isPending || u.isPending, className: "inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: u.isPending ? "Dismissing..." : "Dismiss" })] }), t.appliedAt && jsxs("div", { className: "mt-2 pt-2 border-t border-gray-200/50 text-xs text-green-600", children: ["\u2713 Applied ", t.appliedBy ? `by ${t.appliedBy}` : ""] }), t.dismissedAt && jsxs("div", { className: "mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500", children: ["Dismissed ", t.dismissedBy ? `by ${t.dismissedBy}` : ""] })] }), jsx(We, { isOpen: n, title: "Apply Review-Only Suggestion?", message: jsxs("div", { className: "space-y-3", children: [jsxs("p", { children: ["This suggestion is marked as ", jsx("strong", { children: "review-required" }), " because it may have significant impact:"] }), jsxs("ul", { className: "list-disc list-inside text-sm text-gray-600", children: [jsxs("li", { children: ["Risk posture: ", t.riskPosture] }), jsxs("li", { children: ["Blast radius: ", t.blastRadius.replace(/-/g, " ")] })] }), jsxs("p", { className: "text-amber-700 font-medium", children: ["This change may affect mail delivery for ", a, ". Proceed with caution."] })] }), confirmLabel: "Apply Anyway", cancelLabel: "Cancel", variant: "warning", onConfirm: i, onCancel: () => o(false) })] });
}
function Ze({ result: t }) {
  return jsxs("div", { className: "space-y-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Mail Check Results" }), jsx(re, { label: "DMARC", present: t.dmarc.present, valid: t.dmarc.valid, errors: t.dmarc.errors, description: "Domain-based Message Authentication, Reporting, and Conformance" }), jsx(re, { label: "DKIM", present: t.dkim.present, valid: t.dkim.valid, errors: t.dkim.errors, description: "DomainKeys Identified Mail", extra: t.dkim.present ? jsxs("span", { className: "text-xs text-gray-500", children: ["Selector: ", jsx("code", { className: "bg-gray-100 px-1 rounded", children: t.dkim.selector }), t.dkim.selectorProvenance && jsxs("span", { className: "ml-2 text-gray-400", children: ["(via ", t.dkim.selectorProvenance, ")"] })] }) : null }), jsx(re, { label: "SPF", present: t.spf.present, valid: t.spf.valid, errors: t.spf.errors, description: "Sender Policy Framework" })] });
}
function re({ label: t, present: a, valid: s, errors: n, description: o, extra: l }) {
  const i = { success: { icon: Ge, bg: "bg-green-50", border: "border-green-200", text: "text-green-800", label: "Present & Valid" }, warning: { icon: et, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", label: "Present but Invalid" }, error: { icon: tt, bg: "bg-red-50", border: "border-red-200", text: "text-red-800", label: "Not Found" } }[a ? s ? "success" : "warning" : "error"], p = i.icon;
  return jsxs("div", { className: `p-4 rounded-lg border ${i.bg} ${i.border}`, children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "flex items-center gap-3", children: [jsx(p, { className: `w-5 h-5 ${i.text}` }), jsxs("div", { children: [jsx("h4", { className: `font-medium ${i.text}`, children: t }), jsx("p", { className: "text-sm text-gray-600", children: o }), l] })] }), jsx("span", { className: `text-sm font-medium ${i.text}`, children: i.label })] }), n && n.length > 0 && jsx("div", { className: "mt-3 text-sm text-red-700", children: n.map((h) => jsxs("p", { children: ["\u2022 ", h] }, h)) })] });
}
function Ge({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) });
}
function et({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) });
}
function tt({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) });
}
const rt = { "dmarc-missing": "DMARC record not found", "dmarc-invalid": "DMARC record is invalid", "dkim-missing": "DKIM record not found", "dkim-invalid": "DKIM record is invalid", "spf-missing": "SPF record not found", "spf-invalid": "SPF record is invalid" };
function at({ domain: t, snapshotId: a, issues: s, onClose: n, onSuccess: o }) {
  const [l, d] = useState(false), [u, i] = useState({}), p = useId(), h = `${p}-contact-email`, k = `${p}-contact-name`, w = `${p}-contact-phone`, x = `${p}-priority`, D = `${p}-notes`, [f, y] = useState({ contactEmail: "", contactName: "", contactPhone: "", priority: "medium", notes: "", selectedIssues: s }), S = (g) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g), m = (g) => g ? /^\+?[\d\s-]{8,20}$/.test(g) : true, b = () => {
    const g = {};
    return (!f.contactEmail || !S(f.contactEmail)) && (g.contactEmail = "Valid email address required"), (!f.contactName || f.contactName.length < 2) && (g.contactName = "Name must be at least 2 characters"), f.contactPhone && !m(f.contactPhone) && (g.contactPhone = "Valid phone number required (8-20 digits, optional + prefix)"), f.selectedIssues.length === 0 && (g.issues = "Select at least one issue to fix"), i(g), Object.keys(g).length === 0;
  }, $ = async (g) => {
    if (g.preventDefault(), !!b()) {
      d(true), i({});
      try {
        const c = await fetch("/api/remediation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: t, snapshotId: a, contactEmail: f.contactEmail, contactName: f.contactName, contactPhone: f.contactPhone || void 0, priority: f.priority, issues: f.selectedIssues, notes: f.notes || void 0 }) });
        if (!c.ok) {
          const E = await c.json();
          throw new Error(E.error || "Failed to submit request");
        }
        o == null ? void 0 : o(), n();
      } catch (c) {
        i({ general: c instanceof Error ? c.message : "Failed to submit request" });
      } finally {
        d(false);
      }
    }
  }, R = (g) => {
    y((c) => ({ ...c, selectedIssues: c.selectedIssues.includes(g) ? c.selectedIssues.filter((E) => E !== g) : [...c.selectedIssues, g] }));
  };
  return jsxs("form", { onSubmit: $, className: "bg-white p-6 rounded-lg border space-y-4", children: [jsx("h4", { className: "font-semibold text-lg", children: "Request Remediation" }), jsxs("p", { className: "text-sm text-gray-600", children: ["Submit a request to fix mail configuration issues for ", jsx("strong", { children: t })] }), u.general && jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm", role: "alert", children: u.general }), jsxs("div", { children: [jsx("label", { htmlFor: h, className: "block text-sm font-medium text-gray-700", children: "Contact Email *" }), jsx("input", { id: h, type: "email", value: f.contactEmail, onChange: (g) => y((c) => ({ ...c, contactEmail: g.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "admin@example.com", autoComplete: "email" }), u.contactEmail && jsx("p", { className: "mt-1 text-sm text-red-600", children: u.contactEmail })] }), jsxs("div", { children: [jsx("label", { htmlFor: k, className: "block text-sm font-medium text-gray-700", children: "Contact Name *" }), jsx("input", { id: k, type: "text", value: f.contactName, onChange: (g) => y((c) => ({ ...c, contactName: g.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "John Doe", autoComplete: "name" }), u.contactName && jsx("p", { className: "mt-1 text-sm text-red-600", children: u.contactName })] }), jsxs("div", { children: [jsx("label", { htmlFor: w, className: "block text-sm font-medium text-gray-700", children: "Phone (optional)" }), jsx("input", { id: w, type: "tel", value: f.contactPhone, onChange: (g) => y((c) => ({ ...c, contactPhone: g.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "+1 555-123-4567", autoComplete: "tel" }), u.contactPhone && jsx("p", { className: "mt-1 text-sm text-red-600", children: u.contactPhone })] }), jsxs("div", { children: [jsx("label", { htmlFor: x, className: "block text-sm font-medium text-gray-700", children: "Priority" }), jsxs("select", { id: x, value: f.priority, onChange: (g) => y((c) => ({ ...c, priority: g.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", children: [jsx("option", { value: "low", children: "Low" }), jsx("option", { value: "medium", children: "Medium" }), jsx("option", { value: "high", children: "High" }), jsx("option", { value: "critical", children: "Critical" })] })] }), jsxs("fieldset", { children: [jsx("legend", { className: "block text-sm font-medium text-gray-700", children: "Issues to Fix *" }), jsx("div", { className: "mt-2 space-y-2", children: s.map((g) => {
    const c = `${p}-issue-${g}`;
    return jsxs("label", { htmlFor: c, className: "flex items-center", children: [jsx("input", { id: c, type: "checkbox", checked: f.selectedIssues.includes(g), onChange: () => R(g), className: "focus-ring rounded border-gray-300 text-blue-600" }), jsx("span", { className: "ml-2 text-sm text-gray-700", children: rt[g] || g })] }, g);
  }) }), u.issues && jsx("p", { className: "mt-1 text-sm text-red-600", children: u.issues })] }), jsxs("div", { children: [jsx("label", { htmlFor: D, className: "block text-sm font-medium text-gray-700", children: "Additional Notes" }), jsx("textarea", { id: D, value: f.notes, onChange: (g) => y((c) => ({ ...c, notes: g.target.value })), rows: 3, className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "Any additional context..." })] }), jsxs("div", { className: "flex flex-wrap gap-3 pt-4", children: [jsx("button", { type: "submit", disabled: l, className: "focus-ring min-h-10 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400", children: l ? "Submitting..." : "Submit Request" }), jsx("button", { type: "button", onClick: n, className: "focus-ring min-h-10 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300", children: "Cancel" })] })] });
}
function nt({ domain: t, snapshotId: a }) {
  const [s, n] = useState(false), [o, l] = useState(null), [d, u] = useState(null), [i, p] = useState(false), [h, k] = useState(false), w = async () => {
    n(true), u(null);
    try {
      const y = await fetch("/api/collect/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: t, snapshotId: a }) });
      if (!y.ok) {
        const m = await y.json();
        throw y.status === 401 || y.status === 403 ? new Error("Operator sign-in is required to run mail diagnostics.") : new Error(m.error || "Mail check failed");
      }
      const S = await y.json();
      l(S.results || null), k(false);
    } catch (y) {
      u(y instanceof Error ? y.message : "Unknown error");
    } finally {
      n(false);
    }
  }, D = o ? ((y) => {
    const S = [];
    return y.dmarc.present ? y.dmarc.valid || S.push("dmarc-invalid") : S.push("dmarc-missing"), y.dkim.present ? y.dkim.valid || S.push("dkim-invalid") : S.push("dkim-missing"), y.spf.present ? y.spf.valid || S.push("spf-invalid") : S.push("spf-missing"), S;
  })(o) : [], f = D.length > 0;
  return o ? jsxs("div", { className: "space-y-6", children: [jsx(Ze, { result: o }), f && jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3", children: [jsxs("div", { children: [jsx("h4", { className: "font-semibold text-yellow-900 mb-2", children: "Issues Detected" }), jsxs("p", { className: "text-yellow-800 text-sm", children: ["Submit a tenant-scoped remediation request for the issues detected on", " ", jsx("strong", { children: t }), "."] })] }), h ? jsx("div", { className: "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800", children: "Remediation request submitted." }) : null, i ? jsx(at, { domain: t, snapshotId: a, issues: D, onClose: () => p(false), onSuccess: () => {
    k(true), p(false);
  } }) : jsx("button", { type: "button", onClick: () => p(true), className: "focus-ring min-h-10 px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700", children: "Request Remediation" })] }), jsx("div", { className: "flex gap-3", children: jsx("button", { type: "button", onClick: w, disabled: s, "aria-busy": s, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: s ? "Checking..." : "Re-check" }) })] }) : jsxs("div", { className: "text-center py-12", children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Mail Configuration Check" }), jsxs("p", { className: "text-gray-500 mb-4", children: ["Check DMARC, DKIM, and SPF records for ", jsx("strong", { children: t })] }), d && jsx("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800", role: "alert", children: d }), jsx("button", { type: "button", onClick: w, disabled: s, "aria-busy": s, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: s ? "Checking..." : "Run Mail Check" })] });
}
async function st(t) {
  var _a, _b;
  const a = await fetch(`/api/portfolio/domains/by-name/${encodeURIComponent(t)}`, { credentials: "include" });
  if (a.status === 401) {
    const n = new Error("Unauthorized");
    throw n.status = 401, n;
  }
  if (a.status === 403) {
    const n = new Error("Forbidden");
    throw n.status = 403, n;
  }
  if (a.status === 404) {
    const n = new Error("Not found");
    throw n.status = 404, n;
  }
  if (!a.ok) throw new Error("Failed to resolve domain");
  return (_b = (_a = (await a.json()).domain) == null ? void 0 : _a.id) != null ? _b : null;
}
async function it(t) {
  const a = await fetch(`/api/portfolio/domains/${t}/notes`, { credentials: "include" });
  if (a.status === 401) {
    const n = new Error("Unauthorized");
    throw n.status = 401, n;
  }
  if (a.status === 403) {
    const n = new Error("Forbidden");
    throw n.status = 403, n;
  }
  if (!a.ok) throw new Error("Failed to fetch notes");
  return ((await a.json()).notes || []).map((n) => ({ ...n, author: n.author || n.createdBy || null }));
}
function ce({ domainId: t, isDomainName: a = false }) {
  var _a;
  const s = useQueryClient(), [n, o] = useState(null), [l, d] = useState(""), [u, i] = useState(""), [p, h] = useState(false), [k, w] = useState(null), { data: x, isLoading: D, error: f } = useQuery({ queryKey: ["domain-resolve", t, a], queryFn: () => a ? st(t) : Promise.resolve(t), enabled: !!t, staleTime: 1 / 0 }), y = f ? f.status : void 0, { data: S = [], isLoading: m, error: b } = useQuery({ queryKey: ["notes", x], queryFn: () => it(x), enabled: !!x }), $ = b ? b.status : void 0, R = y === 401 || $ === 401, g = y === 403 || $ === 403, c = y === 404, E = (_a = k != null ? k : f && y !== 401 && y !== 403 && y !== 404 ? f.message : null) != null ? _a : b && $ !== 401 && $ !== 403 ? b.message : null, F = useMutation({ mutationFn: async (v) => {
    const M = await fetch(`/api/portfolio/domains/${x}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: v }), credentials: "include" });
    if (M.status === 401) {
      const I = new Error("Unauthorized");
      throw I.status = 401, I;
    }
    if (M.status === 403) {
      const I = new Error("Forbidden");
      throw I.status = 403, I;
    }
    if (!M.ok) throw new Error("Failed to create note");
    return M.json();
  }, onSuccess: () => {
    i(""), h(false), s.invalidateQueries({ queryKey: ["notes", x] });
  }, onError: (v) => {
    w(v instanceof Error ? v.message : "Failed to create note");
  } }), J = useMutation({ mutationFn: async ({ noteId: v, content: M }) => {
    const I = await fetch(`/api/portfolio/notes/${v}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: M }), credentials: "include" });
    if (I.status === 401) {
      const V = new Error("Unauthorized");
      throw V.status = 401, V;
    }
    if (I.status === 403) {
      const V = new Error("Forbidden");
      throw V.status = 403, V;
    }
    if (!I.ok) throw new Error("Failed to update note");
    return I.json();
  }, onSuccess: () => {
    o(null), d(""), s.invalidateQueries({ queryKey: ["notes", x] });
  }, onError: (v) => {
    w(v instanceof Error ? v.message : "Failed to update note");
  } }), Z = useMutation({ mutationFn: async (v) => {
    const M = await fetch(`/api/portfolio/notes/${v}`, { method: "DELETE", credentials: "include" });
    if (M.status === 401) {
      const I = new Error("Unauthorized");
      throw I.status = 401, I;
    }
    if (M.status === 403) {
      const I = new Error("Forbidden");
      throw I.status = 403, I;
    }
    if (!M.ok) throw new Error("Failed to delete note");
  }, onSuccess: () => {
    s.invalidateQueries({ queryKey: ["notes", x] });
  }, onError: (v) => {
    w(v instanceof Error ? v.message : "Failed to delete note");
  } }), X = () => {
    !u.trim() || !x || F.mutate(u.trim());
  }, G = (v) => {
    l.trim() && J.mutate({ noteId: v, content: l.trim() });
  }, B = (v) => {
    confirm("Are you sure you want to delete this note?") && Z.mutate(v);
  }, N = (v) => {
    o(v.id), d(v.content);
  }, T = () => {
    o(null), d("");
  }, A = D || m, j = F.isPending || J.isPending;
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-white shadow-sm", children: [jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-4 py-3", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Notes" }), !p && jsx("button", { type: "button", onClick: () => h(true), disabled: R || g, className: "text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400", children: "+ Add Note" })] }), jsxs("div", { className: "p-4", children: [R && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or edit tenant notes." }), g && jsx("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900", children: "You can view tenant notes here, but your current role cannot create, edit, or delete them." }), E && jsxs("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800", children: [E, jsx("button", { type: "button", onClick: () => w(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), p && jsxs("div", { className: "mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3", children: [jsx("textarea", { value: u, onChange: (v) => i(v.target.value), placeholder: "Write your note...", rows: 3, disabled: R || g, className: "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" }), jsxs("div", { className: "mt-2 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: () => {
    h(false), i("");
  }, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: j || R || g, children: "Cancel" }), jsx("button", { type: "button", onClick: X, disabled: !u.trim() || j || R || g, className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: j ? "Saving..." : "Save Note" })] })] }), A ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Loading notes..." }) : R ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Sign in to view and manage tenant notes." }) : c ? jsx("div", { className: "py-4 text-center text-gray-500", children: "This domain must exist in the tenant portfolio before notes can be attached." }) : x ? S.length === 0 ? jsxs("div", { className: "py-4 text-center text-gray-500", children: ["No notes yet.", " ", !p && jsx("button", { type: "button", onClick: () => h(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: R || g, children: "Add one" })] }) : jsx("div", { className: "space-y-4", children: S.map((v) => jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-3", children: n === v.id ? jsxs("div", { children: [jsx("textarea", { value: l, onChange: (M) => d(M.target.value), rows: 3, disabled: R || g, className: "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" }), jsxs("div", { className: "mt-2 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: T, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: j || R, children: "Cancel" }), jsx("button", { type: "button", onClick: () => G(v.id), disabled: !l.trim() || j || R || g, className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: j ? "Saving..." : "Save" })] })] }) : jsxs("div", { children: [jsx("p", { className: "whitespace-pre-wrap text-gray-800", children: v.content }), jsxs("div", { className: "mt-2 flex items-center justify-between text-sm", children: [jsxs("div", { className: "text-gray-500", children: [v.author && jsx("span", { className: "mr-2", children: v.author }), jsx("span", { children: ot(v.updatedAt || v.createdAt) })] }), jsxs("div", { className: "flex gap-2", children: [jsx("button", { type: "button", onClick: () => N(v), className: "text-gray-500 hover:text-blue-600 disabled:text-gray-400", disabled: R || g, children: "Edit" }), jsx("button", { type: "button", onClick: () => B(v.id), className: "text-gray-500 hover:text-red-600 disabled:text-gray-400", disabled: R || g, children: "Delete" })] })] })] }) }, v.id)) }) : jsx("div", { className: "py-4 text-center text-gray-500", children: "Notes are unavailable until domain context can be resolved." })] })] });
}
function ot(t) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
const me = { low: "#16a34a", medium: "#d97706", high: "#dc2626" }, lt = { critical: "#dc2626", high: "#ea580c", medium: "#d97706", low: "#2563eb", info: "#6b7280" }, dt = { add: "Add", modify: "Modify", remove: "Remove" };
async function ct(t) {
  const a = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshotId: t }), credentials: "include" });
  if (!a.ok) {
    let s = `Simulation failed (${a.status})`;
    try {
      const n = await a.json();
      n.error && (s = n.error);
    } catch {
    }
    throw new Error(s);
  }
  return await a.json();
}
function mt({ snapshotId: t }) {
  const a = useQueryClient(), [s, n] = useState(false), { data: o, isLoading: l, error: d, refetch: u$1 } = useQuery({ queryKey: ["simulation", t], queryFn: () => ct(t), enabled: !!t && s, staleTime: 300 * 1e3 }), i = () => {
    n(true), u$1();
  };
  return t ? l ? jsx(u, { message: "Running simulation..." }) : d ? jsx(p, { message: d.message, onRetry: i }) : o ? jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [jsxs("div", { style: { display: "flex", gap: "1rem", flexWrap: "wrap", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }, children: [jsx(U, { label: "Changes", value: o.summary.changesProposed }), jsx(U, { label: "Findings before", value: o.summary.findingsBefore }), jsx(U, { label: "After", value: o.summary.findingsAfter, color: o.summary.findingsAfter < o.summary.findingsBefore ? "#16a34a" : void 0 }), jsx(U, { label: "Resolved", value: o.summary.findingsResolved, color: "#16a34a" }), o.summary.findingsNew > 0 && jsx(U, { label: "New", value: o.summary.findingsNew, color: "#d97706" }), o.detectedProvider !== "unknown" && jsxs("span", { style: { padding: "0.25rem 0.75rem", backgroundColor: "#eff6ff", borderRadius: "9999px", fontSize: "0.75rem", color: "#2563eb" }, children: ["Provider: ", o.detectedProvider] })] }), o.proposedChanges.length > 0 && jsxs("section", { children: [jsx("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }, children: "Proposed DNS Changes" }), jsx("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: o.proposedChanges.map((p) => jsx(ut, { change: p }, `${p.action}-${p.name}-${p.type}`)) })] }), o.resolvedFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#16a34a" }, children: ["\u2705 Findings Resolved (", o.resolvedFindings.length, ")"] }), jsx(ae, { findings: o.resolvedFindings })] }), o.newFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#d97706" }, children: ["\u26A0\uFE0F New Findings Introduced (", o.newFindings.length, ")"] }), jsx(ae, { findings: o.newFindings })] }), o.remainingFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#6b7280" }, children: ["Remaining (", o.remainingFindings.length, ")"] }), jsx(ae, { findings: o.remainingFindings })] }), jsx("div", { style: { textAlign: "center" }, children: jsx("button", { type: "button", onClick: () => {
    a.invalidateQueries({ queryKey: ["simulation", t] }), u$1();
  }, style: { padding: "0.375rem 1rem", backgroundColor: "transparent", color: "#2563eb", border: "1px solid #2563eb", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem" }, children: "Re-run Simulation" }) })] }) : jsxs("div", { style: { textAlign: "center", padding: "2rem" }, children: [jsx("p", { style: { color: "#6b7280", marginBottom: "1rem" }, children: "Simulate DNS changes to see which findings would be resolved." }), jsx("button", { type: "button", onClick: i, style: { padding: "0.5rem 1.5rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }, children: "Run Simulation" })] }) : jsx(x, { icon: "shield", title: "No snapshot available", description: "Collect data first, then simulate fixes.", size: "sm" });
}
function U({ label: t, value: a, color: s }) {
  return jsxs("span", { style: { padding: "0.25rem 0.75rem", backgroundColor: "#f1f5f9", borderRadius: "9999px", fontSize: "0.75rem" }, children: [t, ": ", jsx("strong", { style: { color: s || "inherit" }, children: a })] });
}
function ut({ change: t }) {
  return jsxs("div", { style: { padding: "0.75rem 1rem", border: "1px solid #e2e8f0", borderRadius: "8px", borderLeft: `4px solid ${me[t.risk] || "#6b7280"}`, backgroundColor: "white" }, children: [jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }, children: [jsx("span", { style: { padding: "0.125rem 0.375rem", borderRadius: "4px", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", color: "white", backgroundColor: t.action === "add" ? "#16a34a" : t.action === "remove" ? "#dc2626" : "#d97706" }, children: dt[t.action] }), jsxs("code", { style: { fontSize: "0.8125rem", fontWeight: 600 }, children: [t.name, " ", t.type] }), jsxs("span", { style: { fontSize: "0.625rem", color: me[t.risk], fontWeight: 600 }, children: [t.risk, " risk"] })] }), t.currentValues.length > 0 && jsxs("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: "#dc2626", backgroundColor: "#fef2f2", padding: "0.25rem 0.5rem", borderRadius: "4px", marginBottom: "0.25rem" }, children: ["\u2212 ", t.currentValues.join(", ")] }), t.proposedValues.length > 0 && jsxs("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: "#16a34a", backgroundColor: "#f0fdf4", padding: "0.25rem 0.5rem", borderRadius: "4px", marginBottom: "0.25rem" }, children: ["+ ", t.proposedValues.join(", ")] }), jsx("p", { style: { fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0" }, children: t.rationale })] });
}
function ae({ findings: t }) {
  return jsx("div", { style: { display: "flex", flexDirection: "column", gap: "0.25rem" }, children: t.map((a) => jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.75rem", backgroundColor: "#f8f8f8", borderRadius: "6px", fontSize: "0.8125rem" }, children: [jsx("span", { style: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: lt[a.severity] || "#6b7280", flexShrink: 0 } }), jsx("span", { style: { color: "#374151" }, children: a.title }), jsx("span", { style: { fontSize: "0.625rem", color: "#9ca3af", marginLeft: "auto" }, children: a.severity })] }, `${a.type}-${a.severity}`)) });
}
async function ht(t) {
  var _a;
  const a = await fetch(`/api/snapshots/${encodeURIComponent(t)}?limit=50`, { credentials: "include" });
  if (!a.ok) {
    if (a.status === 404) return [];
    throw new Error(`Failed to load snapshots: ${a.status} ${a.statusText}`);
  }
  return (_a = (await a.json()).snapshots) != null ? _a : [];
}
function gt({ domain: t }) {
  const [a, s] = useState(null), [n, o] = useState(null), [l, d] = useState(null), [u$1, i] = useState(null), { data: p$1 = [], isLoading: h, error: k, refetch: w } = useQuery({ queryKey: ["snapshots", t], queryFn: () => ht(t), enabled: !!t }), x$1 = useMutation({ mutationFn: async ({ snapshotA: m, snapshotB: b }) => {
    var _a;
    const $ = m ? `/api/snapshots/${encodeURIComponent(t)}/diff` : `/api/snapshots/${encodeURIComponent(t)}/compare-latest`, R = m ? JSON.stringify({ snapshotA: m, snapshotB: b }) : void 0, g = await fetch($, { method: "POST", headers: { "Content-Type": "application/json" }, body: R });
    if (!g.ok) {
      const c = await g.json().catch(() => ({}));
      throw new Error((_a = c.error) != null ? _a : `${m ? "Diff" : "Compare latest"} failed: ${g.status}`);
    }
    return await g.json();
  }, onSuccess: (m) => {
    d(m), i(null);
  }, onError: (m) => {
    i(m instanceof Error ? m.message : "Unknown error");
  } }), D = () => {
    !a || !n || x$1.mutate({ snapshotA: a, snapshotB: n });
  }, f = () => {
    x$1.mutate({});
  }, y = () => {
    d(null), i(null);
  };
  if (h) return jsx("div", { "data-testid": "snapshot-history-loading", children: jsx(u, { message: "Loading snapshot history\u2026" }) });
  if (k) return jsx("div", { "data-testid": "snapshot-history-error", children: jsx(p, { message: k.message, onRetry: w }) });
  if (p$1.length === 0) return jsx("div", { "data-testid": "snapshot-history-empty", children: jsx(x, { icon: "document", title: "No snapshots yet", description: "Collect DNS evidence to start building snapshot history.", size: "sm" }) });
  const S = x$1.isPending;
  return jsxs("div", { className: "space-y-6", "data-testid": "snapshot-history-panel", children: [jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Snapshot History" }), jsxs("p", { className: "text-sm text-gray-500", children: [p$1.length, " snapshot", p$1.length !== 1 ? "s" : "", " collected"] })] }), jsxs("div", { className: "flex gap-2", children: [p$1.length >= 2 && jsx("button", { type: "button", onClick: f, disabled: S, className: "focus-ring px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", "data-testid": "compare-latest-btn", children: S && !a ? "Comparing\u2026" : "Compare Latest" }), jsx("button", { type: "button", onClick: D, disabled: S || !a || !n || a === n, className: "focus-ring px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", "data-testid": "compare-selected-btn", children: "Compare Selected" })] })] }), jsx("div", { className: "overflow-x-auto border border-gray-200 rounded-lg", children: jsxs("table", { className: "min-w-full text-sm", "data-testid": "snapshot-list-table", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-2 text-left font-medium", children: "A" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "B" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Created" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Ruleset" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Findings" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Scope" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: p$1.map((m) => jsxs("tr", { className: `hover:bg-gray-50 ${a === m.id || n === m.id ? "bg-blue-50" : ""}`, children: [jsx("td", { className: "px-3 py-2", children: jsx("input", { type: "radio", name: "snapshotA", checked: a === m.id, onChange: () => s(m.id), "aria-label": `Select snapshot ${m.id.slice(0, 8)} as A (older)`, className: "accent-blue-600" }) }), jsx("td", { className: "px-3 py-2", children: jsx("input", { type: "radio", name: "snapshotB", checked: n === m.id, onChange: () => o(m.id), "aria-label": `Select snapshot ${m.id.slice(0, 8)} as B (newer)`, className: "accent-blue-600" }) }), jsx("td", { className: "px-3 py-2 tabular-nums whitespace-nowrap", children: new Date(m.createdAt).toLocaleString() }), jsx("td", { className: "px-3 py-2 font-mono text-xs", children: m.rulesetVersionId ? m.rulesetVersionId.slice(0, 8) : "\u2014" }), jsx("td", { className: "px-3 py-2", children: m.findingsEvaluated ? jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800", children: "Evaluated" }) : jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600", children: "Pending" }) }), jsxs("td", { className: "px-3 py-2 text-xs text-gray-500", children: [m.queryScope.names.length, " names, ", m.queryScope.types.length, " types"] })] }, m.id)) })] }) }), u$1 && jsx("div", { className: "p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700", role: "alert", "data-testid": "diff-error", children: u$1 }), S && jsx("div", { "data-testid": "diff-loading", children: jsx(u, { message: "Computing snapshot diff\u2026", size: "sm" }) }), l && jsx(pt, { result: l, onClose: y })] });
}
function pt({ result: t, onClose: a }) {
  const { diff: s, warnings: n } = t, { findingsSummary: o, comparison: l } = s, d = l.recordChanges.filter((i) => i.type !== "unchanged"), u = { added: l.recordChanges.filter((i) => i.type === "added").length, removed: l.recordChanges.filter((i) => i.type === "removed").length, modified: l.recordChanges.filter((i) => i.type === "modified").length, unchanged: l.recordChanges.filter((i) => i.type === "unchanged").length };
  return jsxs("div", { className: "space-y-4", "data-testid": "diff-result", children: [jsxs("div", { className: "flex items-center justify-between", children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Comparison Result" }), jsx("button", { type: "button", onClick: a, className: "text-sm text-gray-500 hover:text-gray-700", "data-testid": "close-diff-btn", children: "\u2715 Close" })] }), jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm", children: [jsxs("div", { className: "rounded-lg bg-gray-50 p-3", children: [jsx("p", { className: "font-medium text-gray-700", children: "Snapshot A (older)" }), jsx("p", { className: "text-xs text-gray-500 tabular-nums", children: new Date(s.snapshotA.createdAt).toLocaleString() }), jsxs("p", { className: "text-xs text-gray-500 font-mono", children: ["Ruleset: ", s.snapshotA.rulesetVersion.slice(0, 8)] })] }), jsxs("div", { className: "rounded-lg bg-gray-50 p-3", children: [jsx("p", { className: "font-medium text-gray-700", children: "Snapshot B (newer)" }), jsx("p", { className: "text-xs text-gray-500 tabular-nums", children: new Date(s.snapshotB.createdAt).toLocaleString() }), jsxs("p", { className: "text-xs text-gray-500 font-mono", children: ["Ruleset: ", s.snapshotB.rulesetVersion.slice(0, 8)] })] })] }), n && n.length > 0 && jsxs("div", { className: "p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800", "data-testid": "diff-warnings", children: [jsx("p", { className: "font-medium mb-1", children: "\u26A0 Warnings" }), jsx("ul", { className: "list-disc list-inside space-y-1", children: n.map((i) => jsx("li", { children: i }, i)) })] }), jsxs("div", { children: [jsx("h5", { className: "text-xs font-medium uppercase tracking-wide text-gray-500 mb-2", children: "DNS Records" }), jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", "data-testid": "diff-summary", children: [jsx(Y, { label: "Added", value: u.added, color: "green" }), jsx(Y, { label: "Removed", value: u.removed, color: "red" }), jsx(Y, { label: "Modified", value: u.modified, color: "yellow" }), jsx(Y, { label: "Unchanged", value: u.unchanged, color: "gray" })] })] }), l.scopeChanges && jsxs("div", { className: "p-3 rounded-lg border border-orange-200 bg-orange-50 text-sm", "data-testid": "scope-changes", children: [jsx("p", { className: "font-medium text-orange-800 mb-1", children: "Scope Changed" }), jsx("p", { className: "text-orange-700", children: l.scopeChanges.message })] }), l.rulesetChange && jsxs("div", { className: "p-3 rounded-lg border border-purple-200 bg-purple-50 text-sm", "data-testid": "ruleset-changes", children: [jsx("p", { className: "font-medium text-purple-800 mb-1", children: "Ruleset Changed" }), jsx("p", { className: "text-purple-700", children: l.rulesetChange.message })] }), d.length > 0 && jsx(ne, { title: "Record Changes", testId: "record-changes", children: jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full text-sm", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Change" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Name" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Type" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Values" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: d.map((i) => {
    var _a, _b, _c, _d, _e2, _f;
    return jsxs("tr", { children: [jsx("td", { className: "px-3 py-1.5", children: jsx(ue, { type: i.type }) }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: i.name }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: i.recordType }), jsxs("td", { className: "px-3 py-1.5 text-xs", children: [i.type === "added" && ((_a = i.valuesB) == null ? void 0 : _a.join(", ")), i.type === "removed" && jsx("span", { className: "line-through text-gray-400", children: (_b = i.valuesA) == null ? void 0 : _b.join(", ") }), i.type === "modified" && jsxs("span", { children: [jsx("span", { className: "line-through text-red-400 mr-1", children: (_d = (_c = i.diff) == null ? void 0 : _c.removed) == null ? void 0 : _d.join(", ") }), jsx("span", { className: "text-green-700", children: (_f = (_e2 = i.diff) == null ? void 0 : _e2.added) == null ? void 0 : _f.join(", ") })] })] })] }, `${i.name}-${i.recordType}-${i.type}`);
  }) })] }) }) }), l.ttlChanges.length > 0 && jsx(ne, { title: "TTL Changes", testId: "ttl-changes", children: jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full text-sm", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Name" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Type" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "Before" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "After" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "\u0394" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: l.ttlChanges.map((i) => jsxs("tr", { children: [jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: i.name }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: i.recordType }), jsxs("td", { className: "px-3 py-1.5 text-right tabular-nums", children: [i.ttlA, "s"] }), jsxs("td", { className: "px-3 py-1.5 text-right tabular-nums", children: [i.ttlB, "s"] }), jsxs("td", { className: `px-3 py-1.5 text-right tabular-nums ${i.change > 0 ? "text-green-700" : "text-red-700"}`, children: [i.change > 0 ? "+" : "", i.change, "s"] })] }, `${i.name}-${i.recordType}`)) })] }) }) }), o.totalChanges > 0 && jsx(ne, { title: "Finding Changes", testId: "finding-changes", children: jsxs("div", { className: "space-y-2", children: [jsxs("div", { className: "flex gap-3 text-xs text-gray-500 mb-2", children: [jsxs("span", { children: ["+", o.added, " added"] }), jsxs("span", { children: ["\u2212", o.removed, " removed"] }), jsxs("span", { children: ["~", o.modified, " modified"] })] }), l.findingChanges.filter((i) => i.type !== "unchanged").map((i) => jsxs("div", { className: "flex items-start gap-2 p-2 rounded border border-gray-100", children: [jsx(ue, { type: i.type }), jsxs("div", { children: [jsx("p", { className: "text-sm font-medium text-gray-900", children: i.title }), jsxs("p", { className: "text-xs text-gray-500", children: [i.findingType, i.severityA && i.severityB && i.severityA !== i.severityB ? ` \xB7 severity ${i.severityA} \u2192 ${i.severityB}` : i.severityB ? ` \xB7 ${i.severityB}` : ""] }), i.description && jsx("p", { className: "text-xs text-gray-400 mt-0.5", children: i.description })] })] }, `${i.findingType}-${i.type}`))] }) }), d.length === 0 && l.ttlChanges.length === 0 && o.totalChanges === 0 && jsx("div", { className: "text-center py-6 text-gray-500 text-sm", "data-testid": "no-changes", children: "No record or finding changes detected between these snapshots." })] });
}
function Y({ label: t, value: a, color: s }) {
  return jsxs("div", { className: `${{ green: "bg-green-50", red: "bg-red-50", yellow: "bg-yellow-50", gray: "bg-gray-50" }[s]} rounded-lg p-3 text-center`, children: [jsx("div", { className: "text-xl font-bold text-gray-900 tabular-nums", children: a }), jsx("div", { className: "text-xs text-gray-600", children: t })] });
}
function ue({ type: t }) {
  var _a, _b;
  const a = { added: "bg-green-100 text-green-800", removed: "bg-red-100 text-red-800", modified: "bg-yellow-100 text-yellow-800", unchanged: "bg-gray-100 text-gray-600" }, s = { added: "+", removed: "\u2212", modified: "~", unchanged: "=" };
  return jsx("span", { className: `inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${(_a = a[t]) != null ? _a : a.unchanged}`, children: (_b = s[t]) != null ? _b : "?" });
}
function ne({ title: t, testId: a, children: s }) {
  return jsxs("div", { "data-testid": a, children: [jsx("h5", { className: "font-medium text-gray-900 mb-2", children: t }), s] });
}
function ge({ children: t, color: a }) {
  return jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{ gray: "bg-gray-100 text-gray-800", green: "bg-green-100 text-green-800", yellow: "bg-yellow-100 text-yellow-800", red: "bg-red-100 text-red-800", blue: "bg-blue-100 text-blue-800", purple: "bg-purple-100 text-purple-800", orange: "bg-orange-100 text-orange-800" }[a]}`, children: t });
}
function yt({ type: t }) {
  const a = { managed: { color: "green", label: "Managed Zone" }, unmanaged: { color: "yellow", label: "Unmanaged (Targeted)" }, unknown: { color: "gray", label: "Unknown" } }, { color: s, label: n } = a[t];
  return jsx(ge, { color: s, children: n });
}
function ft({ state: t }) {
  const a = { complete: { color: "green", label: "Complete" }, partial: { color: "yellow", label: "Partial" }, failed: { color: "red", label: "Failed" } }, { color: s, label: n } = a[t];
  return jsx(ge, { color: s, children: n });
}
async function bt(t) {
  var _a, _b;
  const a = await fetch(`/api/portfolio/domains/by-name/${encodeURIComponent(t)}`, { credentials: "include" });
  if (a.status === 401) {
    const n = new Error("Unauthorized");
    throw n.status = 401, n;
  }
  if (a.status === 403) {
    const n = new Error("Forbidden");
    throw n.status = 403, n;
  }
  if (a.status === 404) {
    const n = new Error("Not found");
    throw n.status = 404, n;
  }
  if (!a.ok) throw new Error("Failed to resolve domain");
  return (_b = (_a = (await a.json()).domain) == null ? void 0 : _a.id) != null ? _b : null;
}
async function xt(t) {
  const a = await fetch(`/api/portfolio/domains/${t}/tags`, { credentials: "include" });
  if (a.status === 401) {
    const n = new Error("Unauthorized");
    throw n.status = 401, n;
  }
  if (a.status === 403) {
    const n = new Error("Forbidden");
    throw n.status = 403, n;
  }
  if (!a.ok) throw new Error("Failed to fetch tags");
  return ((await a.json()).tags || []).map((n) => typeof n == "string" ? n : n.tag);
}
async function Nt() {
  const t = await fetch("/api/portfolio/tags", { credentials: "include" });
  return t.ok ? (await t.json()).tags || [] : [];
}
function he({ domainId: t, isDomainName: a = false, onTagsChange: s }) {
  var _a;
  const n = useQueryClient(), [o, l] = useState(""), [d, u] = useState(false), [i, p] = useState(null), { data: h, isLoading: k, error: w } = useQuery({ queryKey: ["domain-resolve", t, a], queryFn: () => a ? bt(t) : Promise.resolve(t), enabled: !!t, staleTime: 1 / 0 }), x = w ? w.status : void 0, { data: D = [], isLoading: f, error: y } = useQuery({ queryKey: ["tags", h], queryFn: () => xt(h), enabled: !!h }), { data: S = [] } = useQuery({ queryKey: ["portfolio-tags"], queryFn: Nt, staleTime: 1 / 0 }), m = y ? y.status : void 0, b = x === 401 || m === 401, $ = x === 403 || m === 403, R = x === 404, g = (_a = i != null ? i : w && x !== 401 && x !== 403 && x !== 404 ? w.message : null) != null ? _a : y && m !== 401 && m !== 403 ? y.message : null, c = useMutation({ mutationFn: async (N) => {
    const T = await fetch(`/api/portfolio/domains/${h}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag: N }), credentials: "include" });
    if (T.status === 401) {
      const A = new Error("Unauthorized");
      throw A.status = 401, A;
    }
    if (T.status === 403) {
      const A = new Error("Forbidden");
      throw A.status = 403, A;
    }
    if (!T.ok) throw new Error("Failed to add tag");
  }, onSuccess: (N, T) => {
    var _a2;
    l(""), u(false), n.invalidateQueries({ queryKey: ["tags", h] });
    const A = (_a2 = n.getQueryData(["tags", h])) != null ? _a2 : [];
    s == null ? void 0 : s([...A, T]);
  }, onError: (N) => {
    p(N instanceof Error ? N.message : "Failed to add tag");
  } }), E = useMutation({ mutationFn: async (N) => {
    const T = await fetch(`/api/portfolio/domains/${h}/tags/${encodeURIComponent(N)}`, { method: "DELETE", credentials: "include" });
    if (T.status === 401) {
      const A = new Error("Unauthorized");
      throw A.status = 401, A;
    }
    if (T.status === 403) {
      const A = new Error("Forbidden");
      throw A.status = 403, A;
    }
    if (!T.ok) throw new Error("Failed to remove tag");
  }, onSuccess: (N, T) => {
    var _a2;
    n.invalidateQueries({ queryKey: ["tags", h] });
    const A = (_a2 = n.getQueryData(["tags", h])) != null ? _a2 : [];
    s == null ? void 0 : s(A.filter((j) => j !== T));
  }, onError: (N) => {
    p(N instanceof Error ? N.message : "Failed to remove tag");
  } }), F = (N = o) => {
    const T = N.trim().toLowerCase();
    !T || !h || D.includes(T) || c.mutate(T);
  }, J = (N) => {
    h && E.mutate(N);
  }, Z = (N) => {
    N.key === "Enter" ? (N.preventDefault(), F()) : N.key === "Escape" && (u(false), l(""));
  }, X = S.filter((N) => !D.includes(N)), G = k || f, B = c.isPending || E.isPending;
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200 flex items-center justify-between", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Tags" }), !d && jsx("button", { type: "button", onClick: () => u(true), disabled: b || $, className: "text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400", children: "+ Add Tag" })] }), jsxs("div", { className: "p-4", children: [b && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or edit tenant tags." }), $ && jsx("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900", children: "You can view tenant tags here, but your current role cannot add or remove them." }), g && jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm", children: [g, jsx("button", { type: "button", onClick: () => p(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), d && jsxs("div", { className: "mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200", children: [jsxs("div", { className: "flex gap-2", children: [jsx("input", { type: "text", value: o, onChange: (N) => l(N.target.value), onKeyDown: Z, placeholder: "Enter tag name...", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100", disabled: b || $ }), jsx("button", { type: "button", onClick: () => F(), disabled: !o.trim() || B || b || $, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50", children: B ? "Adding..." : "Add" }), jsx("button", { type: "button", onClick: () => {
    u(false), l("");
  }, className: "px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400", disabled: B || b || $, children: "Cancel" })] }), X.length > 0 && jsxs("div", { className: "mt-3", children: [jsx("span", { className: "text-sm text-gray-500", children: "Suggestions:" }), jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: X.slice(0, 10).map((N) => jsx("button", { type: "button", onClick: () => F(N), disabled: B || b || $, className: "px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50", children: N }, N)) })] })] }), G ? jsx("div", { className: "text-center text-gray-500 py-4", children: "Loading tags..." }) : b ? jsx("div", { className: "text-center text-gray-500 py-4", children: "Sign in to view and manage tenant tags." }) : R ? jsx("div", { className: "text-center text-gray-500 py-4", children: "This domain must exist in the tenant portfolio before tags can be attached." }) : h ? D.length === 0 ? jsxs("div", { className: "text-center text-gray-500 py-4", children: ["No tags yet.", " ", !d && jsx("button", { type: "button", onClick: () => u(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: b || $, children: "Add one" })] }) : jsx("div", { className: "flex flex-wrap gap-2", children: D.map((N) => jsxs("span", { className: "inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm", children: [N, jsx("button", { type: "button", onClick: () => J(N), className: "hover:bg-blue-200 rounded-full p-0.5 disabled:text-gray-400 disabled:hover:bg-transparent", disabled: b || $, "aria-label": `Remove ${N} tag`, children: jsx("svg", { "aria-hidden": "true", className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, N)) }) : jsx("div", { className: "text-center text-gray-500 py-4", children: "Tags are unavailable until domain context can be resolved." })] })] });
}
const pe = xe(), vt = Mt(), P = [{ id: "overview", label: "Overview" }, { id: "dns", label: "DNS" }, { id: "mail", label: "Mail" }, { id: "history", label: "History" }, ...pe ? [{ id: "delegation", label: "Delegation" }] : []];
async function wt(t) {
  const a = await fetch(`/api/domain/${t}/latest`, { credentials: "include" });
  if (!a.ok) {
    if (a.status === 404) return { snapshot: null, observations: [] };
    throw new Error(`Failed to load domain data: ${a.status} ${a.statusText}`);
  }
  const s = await a.json();
  let n = [];
  try {
    const o = await fetch(`/api/snapshot/${s.id}/observations`, { credentials: "include" });
    o.ok && (n = await o.json());
  } catch {
  }
  return { snapshot: s, observations: n };
}
function St({ domain: t, snapshot: a, observations: s }) {
  if (!a) return jsxs("div", { className: "space-y-6", children: [jsx("div", { className: "text-center py-12", children: jsxs("p", { className: "text-gray-500", children: ["No DNS evidence available yet for ", t, "."] }) }), jsxs("div", { className: "space-y-4", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Operator Context" }), jsx("p", { className: "text-sm text-gray-500", children: "Keep tenant-scoped notes and tags attached to the domain even before the next evidence refresh." })] }), jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [jsx(ce, { domainId: t, isDomainName: true }), jsx(he, { domainId: t, isDomainName: true })] })] })] });
  const n = s.filter((l) => l.status === "success").length, o = s.length - n;
  return jsxs("div", { className: "space-y-6", children: [jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [jsx(se, { label: "Total Queries", value: s.length }), jsx(se, { label: "Successful", value: n, color: "green" }), jsx(se, { label: "Errors/Timeouts", value: o, color: o > 0 ? "red" : "gray" })] }), vt && jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Fix Simulation" }), jsx("p", { className: "text-sm text-gray-500 mb-3", children: "Simulate DNS changes to see which findings would be resolved." }), jsx(mt, { snapshotId: a.id })] }), jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [jsx("h3", { className: "font-semibold text-blue-900 mb-3", children: "Query Scope" }), jsxs("div", { className: "space-y-3", children: [jsx(ie, { label: "Names", values: a.queriedNames || [] }), jsx(ie, { label: "Types", values: a.queriedTypes || [] }), jsx(ie, { label: "Vantages", values: a.vantages || [] })] }), a.zoneManagement === "unmanaged" ? jsx("p", { className: "mt-3 text-xs text-blue-700", children: "Targeted inspection mode: this is a DNS evidence snapshot, not a full zone enumeration." }) : null] }), jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Snapshot Metadata" }), jsxs("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm", children: [jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Created" }), jsx("dd", { className: "text-gray-900 tabular-nums", children: new Date(a.createdAt).toLocaleString() })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Duration" }), jsx("dd", { className: "text-gray-900 tabular-nums", children: a.collectionDurationMs ? `${a.collectionDurationMs}ms` : "N/A" })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Triggered By" }), jsx("dd", { className: "text-gray-900", children: a.triggeredBy || "Unknown" })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Ruleset" }), jsx("dd", { className: "text-gray-900", children: a.rulesetVersionId || "Pending evaluation" })] })] })] }), jsxs("div", { className: "space-y-4", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Operator Context" }), jsx("p", { className: "text-sm text-gray-500", children: "Keep tenant-scoped notes and tags attached to the domain alongside the latest DNS evidence." })] }), jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [jsx(ce, { domainId: t, isDomainName: true }), jsx(he, { domainId: t, isDomainName: true })] })] })] });
}
function Ct({ observations: t }) {
  return t.length === 0 ? jsx("div", { className: "text-center py-12", children: jsx("p", { className: "text-gray-500", children: "No DNS observations available yet. Refresh to collect DNS data." }) }) : jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "DNS Records" }), jsx("p", { className: "text-sm text-gray-500", children: "View DNS evidence in Parsed, Raw, or Dig-style formats." })] }), jsx(je, { observations: t })] });
}
function kt({ domain: t, snapshotId: a }) {
  return a ? jsxs("div", { className: "space-y-6", children: [jsxs("section", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Mail Security Analysis" }), jsx("p", { className: "text-sm text-gray-500", children: "Persisted mail configuration findings based on collected evidence." })] }), jsx(He, { snapshotId: a })] }), jsxs("section", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "DKIM Selectors" }), jsx("p", { className: "text-sm text-gray-500", children: "Discovered DKIM selectors with provenance and confidence levels." })] }), jsx(Le, { snapshotId: a })] }), jsxs("section", { className: "border-t pt-4", children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Live Diagnostics" }), jsx("p", { className: "text-sm text-gray-500", children: "Run additional mail diagnostics to refresh and analyze current mail configuration." })] }), jsx(nt, { domain: t, snapshotId: a })] })] }) : jsx("div", { className: "text-center py-12", "data-testid": "mail-no-snapshot-state", children: jsxs("p", { className: "text-gray-500", children: ["No DNS evidence available yet for ", t, ". Refresh to collect mail data."] }) });
}
function $t({ domain: t }) {
  return jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Snapshot History" }), jsxs("p", { className: "text-sm text-gray-500", children: ["View and compare past DNS snapshots to track changes over time for ", t, "."] })] }), jsx(gt, { domain: t })] });
}
function Et({ domain: t, snapshotId: a }) {
  return jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Delegation Analysis" }), jsxs("p", { className: "text-sm text-gray-500", children: ["View delegation status, name server configuration, and glue records for ", t, "."] })] }), jsx(Fe, { snapshotId: a != null ? a : null })] });
}
function se({ label: t, value: a, color: s = "gray" }) {
  return jsxs("div", { className: `${{ gray: "bg-gray-50", green: "bg-green-50", red: "bg-red-50" }[s]} rounded-lg p-4 text-center`, children: [jsx("div", { className: "text-2xl font-bold text-gray-900 tabular-nums", children: a }), jsx("div", { className: "text-sm text-gray-600", children: t })] });
}
function ie({ label: t, values: a }) {
  return jsxs("div", { children: [jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-blue-700", children: t }), a.length > 0 ? jsx("div", { className: "mt-1 flex flex-wrap gap-1.5", children: a.map((s) => jsx("span", { className: "rounded-full bg-white/80 border border-blue-200 px-2 py-0.5 text-xs text-blue-900", children: s }, `${t}-${s}`)) }) : jsx("p", { className: "mt-1 text-sm text-blue-800", children: "N/A" })] });
}
const Vt = function() {
  var _a, _b;
  const a = useQueryClient(), s = ve$1.useLoaderData(), { domain: n } = s, { tab: o } = ve$1.useSearch(), [l, d] = useState(o != null ? o : "overview"), [u, i] = useState(null), p = useId(), { data: h, isLoading: k, error: w } = useQuery({ queryKey: ["domain-data", n], queryFn: () => wt(n), enabled: !!n }), x = (_a = h == null ? void 0 : h.snapshot) != null ? _a : null, D = (_b = h == null ? void 0 : h.observations) != null ? _b : [], f = w ? { type: w instanceof Error && w.message.startsWith("Failed to load") ? "fetch_error" : "api_unreachable", message: w instanceof Error ? w.message : "Unable to reach the API server" } : void 0, y = useMutation({ mutationFn: async () => {
    const c = await fetch("/api/collect/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: n, zoneManagement: "unmanaged" }), credentials: "include" });
    if (!c.ok) {
      const E = await c.json().catch(() => ({ error: "Refresh failed" }));
      throw c.status === 401 || c.status === 403 ? new Error("Authentication failed. Please sign in again.") : c.status === 503 ? new Error("DNS collector is temporarily unavailable. The service may be restarting \u2014 try again in 30 seconds.") : c.status === 429 ? new Error(E.message || "Collection rate limit reached. Wait 60 seconds before retrying.") : new Error(E.message || E.error || `Collection failed (${c.status})`);
    }
  }, onSuccess: () => {
    a.invalidateQueries({ queryKey: ["domain-data", n] });
  }, onError: (c) => {
    i(c instanceof Error ? c.message : "Refresh failed");
  } }), S = useCallback((c) => {
    if (d(c), "undefined" < "u") ;
  }, []), m = (c) => `${p}-domain-tab-${c}`, b = (c) => `${p}-domain-panel-${c}`, $ = (c) => {
    requestAnimationFrame(() => {
      var _a2;
      (_a2 = document.getElementById(m(c))) == null ? void 0 : _a2.focus();
    });
  }, R = (c, E) => {
    if (c.key === "ArrowRight") {
      c.preventDefault();
      const F = P[(E + 1) % P.length];
      S(F.id), $(F.id);
      return;
    }
    if (c.key === "ArrowLeft") {
      c.preventDefault();
      const F = P[(E - 1 + P.length) % P.length];
      S(F.id), $(F.id);
      return;
    }
    if (c.key === "Home") {
      c.preventDefault(), S(P[0].id), $(P[0].id);
      return;
    }
    c.key === "End" && (c.preventDefault(), S(P[P.length - 1].id), $(P[P.length - 1].id));
  };
  useEffect(() => {
    !k && !x && !w && !y.isPending && !y.isSuccess && (i(null), y.mutate());
  }, [k, x, w, y.isPending, y.isSuccess, y]);
  const g = useCallback(() => {
    i(null), y.mutate();
  }, [y]);
  return jsxs("div", { "data-loaded": !k || void 0, children: [jsxs("div", { className: "mb-6", children: [jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [jsx("h1", { className: "text-3xl font-bold text-gray-900 break-all", children: n }), jsx("button", { type: "button", onClick: g, disabled: y.isPending, "aria-busy": y.isPending, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: y.isPending ? "Refreshing..." : "Refresh" })] }), x ? jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [jsx(yt, { type: x.zoneManagement }), jsx(ft, { state: x.resultState }), jsxs("span", { className: "text-sm text-gray-500 tabular-nums", children: ["Last updated: ", new Date(x.createdAt).toLocaleString()] })] }) : f ? jsx("div", { className: `mt-4 p-4 rounded-lg border ${f.type === "api_unreachable" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`, "data-testid": "loader-error-banner", children: jsx("p", { className: f.type === "api_unreachable" ? "text-red-800" : "text-orange-800", children: f.message }) }) : y.isPending ? jsx("div", { className: "mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg", "data-testid": "domain-collecting-banner", children: jsxs("div", { className: "flex items-center gap-3", children: [jsx("div", { className: "animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" }), jsxs("p", { className: "text-blue-800", children: ["Collecting DNS data for ", jsx("strong", { children: n }), "... This takes about 5 seconds."] })] }) }) : jsx("div", { className: "mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg", "data-testid": "domain-no-data-banner", children: jsxs("p", { className: "text-yellow-800", children: ["No DNS data for ", n, " yet. Click ", jsx("strong", { children: "Refresh" }), " to collect now."] }) }), u ? jsx("div", { className: "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", "data-testid": "domain-refresh-error-banner", role: "alert", children: u }) : null] }), jsx("div", { className: "border-b border-gray-200 mb-6 overflow-x-auto", children: jsx("div", { role: "tablist", "aria-label": "Domain DNS views", className: "-mb-px flex w-max min-w-full space-x-4 sm:space-x-8", children: P.map((c, E) => jsx("button", { type: "button", id: m(c.id), role: "tab", "aria-selected": l === c.id, "aria-controls": b(c.id), tabIndex: l === c.id ? 0 : -1, onClick: () => S(c.id), onKeyDown: (F) => R(F, E), className: `focus-ring min-h-10 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${l === c.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`, children: c.label }, c.id)) }) }), jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6", children: [jsx("div", { role: "tabpanel", id: b("overview"), "aria-labelledby": m("overview"), hidden: l !== "overview", "data-testid": "domain-tabpanel-overview", children: l === "overview" && jsx(St, { domain: n, snapshot: x, observations: D }) }), jsx("div", { role: "tabpanel", id: b("dns"), "aria-labelledby": m("dns"), hidden: l !== "dns", "data-testid": "domain-tabpanel-dns", children: l === "dns" && jsx(Ct, { observations: D }) }), jsx("div", { role: "tabpanel", id: b("mail"), "aria-labelledby": m("mail"), hidden: l !== "mail", "data-testid": "domain-tabpanel-mail", children: l === "mail" && jsx(kt, { domain: n, snapshotId: x == null ? void 0 : x.id }) }), jsx("div", { role: "tabpanel", id: b("history"), "aria-labelledby": m("history"), hidden: l !== "history", "data-testid": "domain-tabpanel-history", children: l === "history" && jsx($t, { domain: n }) }), pe && jsx("div", { role: "tabpanel", id: b("delegation"), "aria-labelledby": m("delegation"), hidden: l !== "delegation", "data-testid": "domain-tabpanel-delegation", children: l === "delegation" && jsx(Et, { domain: n, snapshotId: x == null ? void 0 : x.id }) })] })] });
};

export { Vt as component };
//# sourceMappingURL=_domain-Ozf-LHxQ.mjs.map
