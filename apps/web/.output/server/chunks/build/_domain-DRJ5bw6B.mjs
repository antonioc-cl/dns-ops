import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useId, useEffect, useCallback } from 'react';
import { u, p, x } from './StateDisplay-DMFHryPA.mjs';
import { aC as be$1, aD as ye$1, aE as Dt } from '../nitro/nitro.mjs';
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
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import '@tanstack/react-router';
import '@tanstack/history';
import 'node:stream';
import 'react-dom/server';
import 'node:stream/web';

function he(t) {
  return t == null ? "UNKNOWN" : { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED", 6: "YXDOMAIN", 7: "YXRRSET", 8: "NXRRSET", 9: "NOTAUTH", 10: "NOTZONE" }[t] || `RCODE_${t}`;
}
function ge(t) {
  if (!t) return "";
  const a = [];
  return t.authoritative && a.push("aa"), t.truncated && a.push("tc"), t.recursionDesired && a.push("rd"), t.recursionAvailable && a.push("ra"), t.authenticated && a.push("ad"), t.checkingDisabled && a.push("cd"), a.join(" ");
}
function X(t) {
  const a = t.name.endsWith(".") ? t.name : `${t.name}.`;
  if (t.type === "MX" && t.priority !== void 0) return `${a}	${t.ttl}	IN	${t.type}	${t.priority}	${t.data}`;
  if (t.type === "SOA") {
    const n = t.data.split(" ");
    return `${a}	${t.ttl}	IN	${t.type}	${n.join("	")}`;
  }
  return `${a}	${t.ttl}	IN	${t.type}	${t.data}`;
}
function pe(t, a = {}) {
  var _a, _b, _c;
  const { showComments: n = true, showQuestion: o = true } = a, i = [];
  n && (i.push(`; <<>> DNS Ops Workbench <<>> ${t.queryName} ${t.queryType}`), i.push("; (1 server found)"), i.push(";; global options: +cmd"), i.push(";; Got answer:"));
  const l = he(t.responseCode), u = ge(t.flags), d = ((_a = t.answerSection) == null ? void 0 : _a.length) || 0, s = ((_b = t.authoritySection) == null ? void 0 : _b.length) || 0, p = ((_c = t.additionalSection) == null ? void 0 : _c.length) || 0;
  if (i.push(`;; ->>HEADER<<- opcode: QUERY, status: ${l}, id: ${t.id.slice(0, 4)}`), i.push(`;; flags: ${u}; QUERY: 1, ANSWER: ${d}, AUTHORITY: ${s}, ADDITIONAL: ${p}`), o) {
    i.push(""), i.push(";; QUESTION SECTION:");
    const c = t.queryName.endsWith(".") ? t.queryName : `${t.queryName}.`;
    i.push(`;${c}		IN	${t.queryType}`);
  }
  if (d > 0) {
    i.push(""), i.push(";; ANSWER SECTION:");
    for (const c of t.answerSection || []) i.push(X(c));
  }
  if (s > 0) {
    i.push(""), i.push(";; AUTHORITY SECTION:");
    for (const c of t.authoritySection || []) i.push(X(c));
  }
  if (p > 0) {
    i.push(""), i.push(";; ADDITIONAL SECTION:");
    for (const c of t.additionalSection || []) i.push(X(c));
  }
  return i.push(""), i.push(`;; Query time: ${t.responseTimeMs || 0} msec`), i.push(`;; SERVER: ${t.vantageIdentifier || t.vantageType}#53`), i.push(`;; WHEN: ${new Date(t.queriedAt).toString()}`), i.push(`;; MSG SIZE rcvd: ${ye(t)}`), i.join(`
`);
}
function fe(t, a) {
  return t.map((n) => pe(n, a)).join(`

; ========================================

`);
}
function ye(t) {
  let a = 12;
  a += t.queryName.length + 4;
  for (const n of t.answerSection || []) a += n.name.length + n.data.length + 12;
  for (const n of t.authoritySection || []) a += n.name.length + n.data.length + 12;
  for (const n of t.additionalSection || []) a += n.name.length + n.data.length + 12;
  return a;
}
function be(t) {
  var _a;
  const a = /* @__PURE__ */ new Map();
  for (const n of t) {
    const o = `${n.queryName.toLowerCase()}|${n.queryType}`;
    a.has(o) || a.set(o, []), (_a = a.get(o)) == null ? void 0 : _a.push(n);
  }
  return a;
}
function xe(t) {
  const a = [];
  for (const n of t) n.type === "MX" && n.priority !== void 0 ? a.push(`${n.priority} ${n.data}`) : a.push(n.data);
  return [...new Set(a)];
}
function Ne(t, a) {
  if (t.length !== a.length) return false;
  const n = [...t].sort(), o = [...a].sort();
  return n.every((i, l) => i === o[l]);
}
function ve(t) {
  const a = be(t), n = [];
  for (const [o, i] of a) {
    const [l, u] = o.split("|"), d = i.filter((N) => N.status === "success"), s = i.filter((N) => N.status !== "success"), p = [], c = [], m = [], y = /* @__PURE__ */ new Map();
    for (const N of d) {
      const $ = N.vantageIdentifier || N.vantageType;
      c.push($), m.push(N.id);
      const A = xe(N.answerSection || []);
      p.push(...A), y.set($, A);
    }
    for (const N of s) {
      const $ = N.vantageIdentifier || N.vantageType;
      c.push(`${$} (${N.status})`), m.push(N.id);
    }
    const S = [...new Set(p)];
    let C = true;
    const w = [];
    if (y.size > 1) {
      const N = y.values().next();
      if (N.value) {
        const $ = N.value;
        for (const [, A] of y) if (!Ne($, A)) {
          C = false, w.push("Values differ across vantages");
          break;
        }
      }
    }
    if (s.length > 0) {
      const N = [...new Set(s.map(($) => $.status))];
      w.push(`Failures from ${s.length} vantage(s): ${N.join(", ")}`), C = false;
    }
    const v = d.flatMap((N) => (N.answerSection || []).map(($) => $.ttl)).filter((N) => N !== void 0), D = v.length > 0 ? Math.round(v.reduce((N, $) => N + $, 0) / v.length) : 0;
    n.push({ name: l, type: u, ttl: D, values: S, sourceVantages: [...new Set(c)], sourceObservationIds: m, isConsistent: C, consolidationNotes: w.length > 0 ? w.join("; ") : void 0 });
  }
  return n;
}
function we(t) {
  var _a;
  const a = /* @__PURE__ */ new Map();
  for (const i of t) a.has(i.type) || a.set(i.type, []), (_a = a.get(i.type)) == null ? void 0 : _a.push(i);
  const n = ["SOA", "NS", "A", "AAAA", "CNAME", "MX", "TXT", "CAA"], o = /* @__PURE__ */ new Map();
  for (const i of n) {
    const l = a.get(i);
    l && o.set(i, l);
  }
  for (const [i, l] of a) o.has(i) || o.set(i, l);
  return o;
}
function Se(t, a) {
  switch (t) {
    case "MX": {
      const n = a.match(/^(\d+)\s+(.+)$/);
      return n ? `${n[2]} (priority: ${n[1]})` : a;
    }
    case "SOA": {
      const n = a.split(" ");
      return n.length >= 2 ? `Primary: ${n[0]}, Contact: ${n[1]}` : a;
    }
    case "TXT":
      return a.replace(/^"/, "").replace(/"$/, "");
    default:
      return a;
  }
}
function Ce(t) {
  return { A: "IPv4 Address", AAAA: "IPv6 Address", CNAME: "Canonical Name", MX: "Mail Exchange", NS: "Name Server", SOA: "Start of Authority", TXT: "Text", CAA: "Certification Authority Authorization", PTR: "Pointer", SRV: "Service" }[t] || t;
}
function ke({ snapshotId: t }) {
  const [a, n] = useState(null), [o, i] = useState([]), [l, u$1] = useState(false), [d, s] = useState(null), p$1 = useCallback(async () => {
    if (t) {
      u$1(true), s(null);
      try {
        const [c, m] = await Promise.all([fetch(`/api/snapshot/${t}/delegation`), fetch(`/api/snapshot/${t}/delegation/issues`)]);
        if (!c.ok) throw new Error(`Failed to load delegation: ${c.status} ${c.statusText}`);
        if (!m.ok) throw new Error(`Failed to load delegation issues: ${m.status} ${m.statusText}`);
        const [y, S] = await Promise.all([c.json(), m.json()]);
        n(y.delegation || null), i(S.issues || []);
      } catch (c) {
        s(c instanceof Error ? c.message : "Unknown error occurred");
      } finally {
        u$1(false);
      }
    }
  }, [t]);
  return useEffect(() => {
    p$1();
  }, [p$1]), t ? l ? jsx("div", { "data-testid": "delegation-loading-state", children: jsx(u, { message: "Loading delegation data..." }) }) : d ? jsx("div", { "data-testid": "delegation-error-state", children: jsx(p, { message: d }) }) : a ? jsxs("div", { className: "space-y-6", "data-testid": "delegation-panel", children: [o.length > 0 && jsx("div", { className: "space-y-3", children: o.map((c) => jsx(Re, { issue: c }, `${c.type}-${c.severity}-${c.description}`)) }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Parent Zone Delegation" }), jsx("div", { className: "bg-gray-50 rounded-lg p-4", children: jsxs("div", { className: "grid grid-cols-2 gap-4", children: [jsxs("div", { children: [jsx("span", { className: "text-sm text-gray-500", children: "Domain" }), jsx("p", { className: "font-mono text-sm", children: a.domain })] }), jsxs("div", { children: [jsx("span", { className: "text-sm text-gray-500", children: "Parent Zone" }), jsx("p", { className: "font-mono text-sm", children: a.parentZone })] })] }) })] }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Name Servers" }), jsx("div", { className: "space-y-2", children: a.nameServers.length > 0 ? a.nameServers.map((c) => jsxs("div", { className: "flex items-center justify-between p-3 bg-white border rounded-lg", children: [jsx("code", { className: "font-mono text-sm", children: c.name }), jsxs("span", { className: "text-xs text-gray-500", children: ["via ", c.source] })] }, `${c.name}-${c.source}`)) : jsx("p", { className: "text-sm text-gray-500", children: "No name servers found" }) })] }), jsxs("section", { children: [jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Glue Records" }), a.glue.length > 0 ? jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: a.glue.map((c) => jsxs("div", { className: "p-3 bg-white border rounded-lg", children: [jsx("div", { className: "font-mono text-sm", children: c.name }), jsxs("div", { className: "flex items-center gap-2 mt-1", children: [jsx("span", { className: `text-xs px-2 py-0.5 rounded ${c.type === "A" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`, children: c.type }), jsx("code", { className: "text-sm text-gray-600", children: c.address })] })] }, `${c.name}-${c.type}-${c.address}`)) }) : jsx("p", { className: "text-sm text-gray-500", children: "No glue records found" })] }), jsxs("section", { className: "flex items-center gap-3 pt-4 border-t", children: [jsx(ae, { label: "DNSSEC", status: a.hasDnssec ? "present" : "absent", color: a.hasDnssec ? "green" : "gray" }), jsx(ae, { label: "Divergence", status: a.hasDivergence ? "detected" : "none", color: a.hasDivergence ? "red" : "green" })] })] }) : jsx("div", { "data-testid": "delegation-no-data-state", children: jsx(x, { icon: "globe", title: "No delegation data available", description: "Delegation collection may not have been enabled for this snapshot." }) }) : jsx("div", { "data-testid": "delegation-no-snapshot-state", children: jsx(x, { icon: "globe", title: "No delegation data available", description: "Collect a DNS snapshot to view delegation analysis.", size: "sm" }) });
}
function Re({ issue: t }) {
  var _a, _b;
  const [a, n] = useState(false), o = t.evidence && t.evidence.length > 0, i = { critical: { bg: "bg-red-50 border-red-200", dot: "bg-red-500" }, high: { bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" }, medium: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" }, low: { bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" } }, l = i[t.severity] || i.medium;
  return jsxs("div", { className: `rounded-lg border ${l.bg}`, children: [jsx("div", { className: "p-4", children: jsxs("div", { className: "flex items-start gap-3", children: [jsx("div", { className: `w-2 h-2 rounded-full mt-2 ${l.dot}` }), jsxs("div", { className: "flex-1", children: [jsx("h4", { className: "font-medium text-gray-900", children: t.description }), jsxs("p", { className: "text-sm text-gray-600 mt-1 capitalize", children: [t.type.replace(/-/g, " "), " \u2022 ", t.severity, " severity"] })] }), o && jsxs("button", { type: "button", onClick: () => n(!a), className: "text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1", children: [jsx("svg", { "aria-hidden": "true", className: `w-4 h-4 transition-transform ${a ? "rotate-180" : ""}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) }), "Evidence"] })] }) }), a && o && jsxs("div", { className: "border-t border-gray-200 bg-white/50 p-4", children: [jsxs("h5", { className: "text-xs font-medium text-gray-500 uppercase mb-3", children: ["Observation Evidence (", (_a = t.evidence) == null ? void 0 : _a.length, ")"] }), jsx("div", { className: "space-y-3", children: (_b = t.evidence) == null ? void 0 : _b.map((u) => jsx($e, { evidence: u }, `${u.queryName}-${u.queryType}-${u.source}-${u.status}`)) })] })] });
}
function $e({ evidence: t }) {
  const [a, n] = useState(false), o = { success: "bg-green-100 text-green-700", error: "bg-red-100 text-red-700", timeout: "bg-yellow-100 text-yellow-700", nodata: "bg-gray-100 text-gray-600" };
  return jsxs("div", { className: "p-3 bg-white rounded border border-gray-200", children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("code", { className: "text-sm font-mono text-gray-900", children: t.queryName }), jsx("span", { className: "px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium", children: t.queryType }), jsx("span", { className: `px-1.5 py-0.5 text-xs rounded font-medium ${o[t.status] || "bg-gray-100 text-gray-600"}`, children: t.status })] }), jsxs("p", { className: "text-xs text-gray-500 mt-1", children: ["Source: ", jsx("span", { className: "font-medium", children: t.source })] })] }), t.data && jsx("button", { type: "button", onClick: () => n(!a), className: "text-xs text-blue-600 hover:text-blue-700 ml-2", children: a ? "Hide" : "Raw" })] }), a && t.data && jsx("div", { className: "mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto", children: jsx("pre", { className: "text-gray-100 font-mono whitespace-pre-wrap", children: JSON.stringify(t.data, null, 2) }) })] });
}
function ae({ label: t, status: a, color: n }) {
  return jsxs("div", { className: `px-3 py-1.5 rounded-lg text-sm ${{ green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800", gray: "bg-gray-100 text-gray-800" }[n]}`, children: [jsxs("span", { className: "font-medium", children: [t, ":"] }), " ", jsx("span", { className: "capitalize", children: a })] });
}
function De({ snapshotId: t }) {
  const [a, n] = useState([]), [o, i] = useState(false), [l, u$1] = useState(null);
  return useEffect(() => {
    t && (i(true), fetch(`/api/snapshot/${t}/selectors`).then((d) => d.json()).then((d) => {
      n(d.selectors || []), i(false);
    }).catch((d) => {
      u$1(d.message), i(false);
    }));
  }, [t]), o ? jsx(u, { message: "Discovering DKIM selectors...", size: "sm" }) : l ? jsx(p, { message: l, size: "sm" }) : a.length === 0 ? jsxs("div", { className: "text-sm text-gray-500", children: [jsx("p", { children: "No DKIM selectors discovered yet." }), jsx("p", { className: "mt-1", children: "This may indicate:" }), jsxs("ul", { className: "list-disc ml-5 mt-1", children: [jsx("li", { children: "No DKIM configured for this domain" }), jsx("li", { children: "Selectors use non-standard names" }), jsx("li", { children: "Provider not in detection database" })] })] }) : jsxs("div", { className: "space-y-3", children: [a.map((d) => jsxs("div", { className: `p-3 rounded-lg border ${d.found ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`, children: [jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsxs("code", { className: "text-sm font-mono font-medium", children: [d.selector, "._domainkey"] }), d.found && jsx("span", { className: "text-green-600", children: jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", "aria-hidden": "true", focusable: "false", children: jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }) })] }), jsx(Ee, { confidence: d.confidence })] }), jsxs("div", { className: "mt-2 text-xs text-gray-600", children: [jsx("span", { className: "font-medium", children: "Source:" }), " ", Ae(d.provenance), d.provider && jsxs("span", { className: "ml-2 text-blue-600", children: ["(", d.provider, ")"] })] })] }, d.selector)), jsx("p", { className: "text-xs text-gray-500 mt-3", children: "Selectors discovered using a 5-level precedence strategy (managed config \u2192 operator supplied \u2192 provider heuristic \u2192 common dictionary \u2192 not found)." })] });
}
function Ee({ confidence: t }) {
  const a = { certain: "bg-green-100 text-green-800", high: "bg-blue-100 text-blue-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-orange-100 text-orange-800", heuristic: "bg-gray-100 text-gray-600" };
  return jsx("span", { className: `px-2 py-0.5 rounded text-xs font-medium ${a[t] || a.heuristic}`, children: t });
}
function Ae(t) {
  return { "managed-zone-config": "Managed zone configuration", "operator-supplied": "Operator supplied", "provider-heuristic": "Provider heuristic detection", "common-dictionary": "Common selector dictionary", "not-found": "Not found" }[t] || t;
}
const L = [{ id: "parsed", label: "Parsed", description: "Structured record view" }, { id: "raw", label: "Raw", description: "Complete response data" }, { id: "dig", label: "Dig", description: "CLI-style output" }];
function Te({ observations: t }) {
  const [a, n] = useState("parsed"), o = useId(), i = (s) => `${o}-dns-view-tab-${s}`, l = (s) => `${o}-dns-view-panel-${s}`, u = (s) => {
    requestAnimationFrame(() => {
      var _a;
      (_a = document.getElementById(i(s))) == null ? void 0 : _a.focus();
    });
  };
  return jsxs("div", { children: [jsx(Ie, { current: a, onChange: n, onKeyDown: (s, p) => {
    if (s.key === "ArrowRight") {
      s.preventDefault();
      const c = L[(p + 1) % L.length];
      n(c.id), u(c.id);
      return;
    }
    if (s.key === "ArrowLeft") {
      s.preventDefault();
      const c = (p - 1 + L.length) % L.length, m = L[c];
      n(m.id), u(m.id);
      return;
    }
    if (s.key === "Home") {
      s.preventDefault();
      const c = L[0];
      n(c.id), u(c.id);
      return;
    }
    if (s.key === "End") {
      s.preventDefault();
      const c = L[L.length - 1];
      n(c.id), u(c.id);
    }
  }, getTabId: i, getPanelId: l }), jsxs("div", { className: "mt-4", children: [jsx("div", { role: "tabpanel", id: l("parsed"), "aria-labelledby": i("parsed"), hidden: a !== "parsed", children: a === "parsed" && jsx(Me, { observations: t }) }), jsx("div", { role: "tabpanel", id: l("raw"), "aria-labelledby": i("raw"), hidden: a !== "raw", children: a === "raw" && jsx(Oe, { observations: t }) }), jsx("div", { role: "tabpanel", id: l("dig"), "aria-labelledby": i("dig"), hidden: a !== "dig", children: a === "dig" && jsx(Pe, { observations: t }) })] })] });
}
function Ie({ current: t, onChange: a, onKeyDown: n, getTabId: o, getPanelId: i }) {
  return jsx("div", { className: "rounded-lg bg-gray-100 p-1", role: "tablist", "aria-label": "DNS view mode", children: jsx("div", { className: "flex space-x-1", children: L.map((l, u) => jsx("button", { type: "button", id: o(l.id), role: "tab", "aria-selected": t === l.id, "aria-controls": i(l.id), tabIndex: t === l.id ? 0 : -1, onClick: () => a(l.id), onKeyDown: (d) => n(d, u), className: `focus-ring flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${t === l.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`, title: l.description, children: l.label }, l.id)) }) });
}
function Me({ observations: t }) {
  const a = ve(t), n = we(a);
  return a.length === 0 ? jsx("div", { className: "text-center py-8 text-gray-500", children: "No successful observations to display" }) : jsx("div", { className: "space-y-6", children: Array.from(n.entries()).map(([o, i]) => jsxs("section", { className: "border rounded-lg overflow-hidden", children: [jsx("div", { className: "bg-gray-50 px-4 py-2 border-b", children: jsxs("h4", { className: "font-semibold text-gray-900", children: [o, " Records", jsxs("span", { className: "ml-2 text-sm font-normal text-gray-500", children: ["(", i.length, ") \xB7 ", Ce(o)] })] }) }), jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [jsx("thead", { className: "bg-gray-50", children: jsxs("tr", { children: [jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Name" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "TTL" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Value" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Sources" }), jsx("th", { scope: "col", className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Status" })] }) }), jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: i.map((l) => jsxs("tr", { children: [jsx("td", { className: "px-4 py-2 text-sm font-mono text-gray-900", children: l.name }), jsx("td", { className: "px-4 py-2 text-sm text-gray-600 tabular-nums", children: l.ttl !== null && l.ttl !== void 0 ? `${l.ttl}s` : "\u2014" }), jsx("td", { className: "px-4 py-2 text-sm", children: jsx("div", { className: "space-y-1", children: l.values.map((u) => {
    const d = typeof u == "string" ? u : JSON.stringify(u);
    return jsx("div", { className: "font-mono text-gray-800", children: Se(l.type, u) }, `${l.name}-${l.type}-${d}`);
  }) }) }), jsx("td", { className: "px-4 py-2 text-sm text-gray-600", children: l.sourceVantages.join(", ") }), jsx("td", { className: "px-4 py-2", children: l.isConsistent ? jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800", children: "Consistent" }) : jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800", title: l.consolidationNotes, children: "Divergent" }) })] }, `${l.name}-${l.type}-${l.values.join(",")}`)) })] }) })] }, o)) });
}
function Oe({ observations: t }) {
  return jsx("div", { className: "space-y-4", children: t.map((a) => {
    var _a;
    return jsxs("details", { className: "border rounded-lg overflow-hidden", open: a.status !== "success", children: [jsx("summary", { className: "bg-gray-50 px-4 py-2 cursor-pointer hover:bg-gray-100", children: jsxs("div", { className: "flex items-center justify-between", children: [jsxs("span", { className: "font-medium", children: [a.queryName, " ", a.queryType, jsxs("span", { className: "ml-2 text-sm text-gray-500", children: ["from ", a.vantageIdentifier || a.vantageType] })] }), jsx(Fe, { status: a.status })] }) }), jsxs("div", { className: "px-4 py-3 space-y-3", children: [jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Response Code:" }), " ", jsx("span", { className: "font-mono", children: (_a = a.responseCode) != null ? _a : "N/A" })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Response Time:" }), " ", jsxs("span", { className: "tabular-nums", children: [a.responseTimeMs, "ms"] })] }), jsxs("div", { children: [jsx("span", { className: "text-gray-500", children: "Queried At:" }), " ", jsx("span", { children: new Date(a.queriedAt).toLocaleString() })] })] }), !!a.flags && jsxs("div", { children: [jsx("span", { className: "text-gray-500 text-sm", children: "Flags:" }), jsx("pre", { className: "mt-1 text-xs bg-gray-50 p-2 rounded", children: JSON.stringify(a.flags, null, 2) })] }), jsx(_, { title: "Answer Section", data: a.answerSection }), jsx(_, { title: "Authority Section", data: a.authoritySection }), jsx(_, { title: "Additional Section", data: a.additionalSection }), a.errorMessage && jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-3", children: [jsx("span", { className: "text-red-800 font-medium", children: "Error:" }), jsx("pre", { className: "mt-1 text-sm text-red-700", children: a.errorMessage })] }), a.rawResponse && jsxs("div", { children: [jsx("span", { className: "text-gray-500 text-sm", children: "Raw Response:" }), jsx("pre", { className: "mt-1 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto", children: a.rawResponse })] })] })] }, a.id);
  }) });
}
function _({ title: t, data: a }) {
  return !a || Array.isArray(a) && a.length === 0 ? null : jsxs("div", { children: [jsxs("span", { className: "text-gray-500 text-sm", children: [t, ":"] }), jsx("pre", { className: "mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto", children: JSON.stringify(a, null, 2) })] });
}
function Fe({ status: t }) {
  const a = { success: { color: "bg-green-100 text-green-800", label: "Success" }, timeout: { color: "bg-yellow-100 text-yellow-800", label: "Timeout" }, refused: { color: "bg-orange-100 text-orange-800", label: "Refused" }, nxdomain: { color: "bg-red-100 text-red-800", label: "NXDOMAIN" }, nodata: { color: "bg-yellow-100 text-yellow-800", label: "NODATA" }, error: { color: "bg-red-100 text-red-800", label: "Error" }, truncated: { color: "bg-yellow-100 text-yellow-800", label: "Truncated" } }, { color: n, label: o } = a[t] || { color: "bg-gray-100 text-gray-800", label: t };
  return jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${n}`, children: o });
}
function Pe({ observations: t }) {
  const [a, n] = useState(false), o = a ? t : t.slice(0, 5), i = t.length > 5;
  return jsxs("div", { children: [jsx("div", { className: "bg-gray-900 text-gray-100 rounded-lg overflow-hidden", children: jsx("div", { className: "p-4 font-mono text-sm whitespace-pre overflow-x-auto", children: String(fe(o)) }) }), i && !a && jsxs("button", { type: "button", onClick: () => n(true), className: "focus-ring mt-2 text-sm text-blue-600 hover:text-blue-800", children: ["Show all ", t.length, " observations..."] })] });
}
function Le({ isOpen: t, title: a, message: n, confirmLabel: o = "Confirm", cancelLabel: i = "Cancel", variant: l = "danger", onConfirm: u, onCancel: d }) {
  const s = useId(), p = useId();
  return t ? jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", onKeyDown: (y) => {
    y.key === "Escape" && d();
  }, role: "dialog", "aria-modal": "true", "aria-labelledby": s, "aria-describedby": p, tabIndex: -1, children: [jsx("button", { type: "button", className: "absolute inset-0 w-full h-full bg-transparent", onClick: d, "aria-label": "Close dialog" }), jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden", role: "document", children: [jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: jsx("h3", { id: s, className: `text-lg font-semibold ${l === "danger" ? "text-red-700" : "text-amber-700"}`, children: a }) }), jsx("div", { className: "px-6 py-4", id: p, children: jsx("div", { className: "text-gray-700", children: n }) }), jsxs("div", { className: "px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3", children: [jsx("button", { type: "button", onClick: d, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: i }), jsx("button", { type: "button", onClick: u, className: `px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${l === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}`, children: o })] })] })] }) : null;
}
function je({ snapshotId: t }) {
  const [a, n] = useState(null), [o, i] = useState(false), [l, u$1] = useState(null);
  if (useEffect(() => {
    t && (i(true), u$1(null), fetch(`/api/snapshot/${t}/findings/mail`).then((m) => {
      if (!m.ok) throw new Error("Failed to fetch mail findings");
      return m.json();
    }).then((m) => {
      n(m), i(false);
    }).catch((m) => {
      u$1(m.message), i(false);
    }));
  }, [t]), !t) return jsx(x, { icon: "inbox", title: "No snapshot available", description: "Collect data to analyze mail configuration.", size: "sm" });
  if (o) return jsx(u, { message: "Analyzing mail configuration...", size: "sm" });
  if (l) return jsx(p, { message: l, size: "sm" });
  if (!a) return null;
  const { mailConfig: d, findings: s, suggestions: p$1 } = a, c = ze(s);
  return jsxs("div", { className: "space-y-6", children: [jsx("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100", children: jsxs("div", { className: "flex items-center justify-between", children: [jsxs("div", { children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Mail Security Score" }), jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Based on SPF, DMARC, DKIM, MTA-STS, and TLS-RPT configuration" })] }), jsx("div", { className: "flex items-center gap-2", children: jsx(Be, { score: d.securityScore }) })] }) }), jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3", children: [jsx(V, { name: "MX", present: d.hasMx }), jsx(V, { name: "SPF", present: d.hasSpf }), jsx(V, { name: "DMARC", present: d.hasDmarc }), jsx(V, { name: "DKIM", present: d.hasDkim }), jsx(V, { name: "MTA-STS", present: d.hasMtaSts, optional: true }), jsx(V, { name: "TLS-RPT", present: d.hasTlsRpt, optional: true })] }), (d.issues.length > 0 || d.recommendations.length > 0) && jsxs("div", { className: "space-y-3", children: [d.issues.length > 0 && jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: [jsx("h5", { className: "text-sm font-medium text-red-800 mb-2", children: "Issues" }), jsx("ul", { className: "space-y-1", children: d.issues.map((m) => jsxs("li", { className: "text-sm text-red-700 flex items-start gap-2", children: [jsx("span", { className: "text-red-500 mt-0.5", children: "\xD7" }), m] }, m)) })] }), d.recommendations.length > 0 && jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3", children: [jsx("h5", { className: "text-sm font-medium text-amber-800 mb-2", children: "Recommendations" }), jsx("ul", { className: "space-y-1", children: d.recommendations.map((m) => jsxs("li", { className: "text-sm text-amber-700 flex items-start gap-2", children: [jsx("span", { className: "text-amber-500 mt-0.5", children: "\u2192" }), m] }, m)) })] })] }), jsxs("div", { className: "border-t pt-4", children: [jsxs("div", { className: "flex items-center justify-between mb-4", children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Mail Findings" }), s.length > 0 && jsxs("span", { className: "text-sm text-gray-500", children: [s.length, " finding", s.length !== 1 ? "s" : ""] })] }), s.length === 0 && jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: jsx("p", { className: "text-green-800 text-sm", children: "\u2713 No mail configuration issues detected." }) }), ["critical", "high", "medium", "low", "info"].map((m) => {
    const y = c[m];
    return !y || y.length === 0 ? null : jsxs("div", { className: "space-y-2 mb-4", children: [jsxs("h5", { className: "text-sm font-medium text-gray-700 capitalize", children: [m, " (", y.length, ")"] }), y.map((S) => jsx(qe, { finding: S, domain: a.domain, suggestions: p$1.filter((C) => C.findingId === S.id) }, S.id))] }, m);
  })] }), jsxs("div", { className: "text-xs text-gray-400 pt-2 border-t", children: ["Ruleset v", a.rulesetVersion, " \xB7 ", a.persisted ? "Persisted" : "Live", " evaluation"] })] });
}
function Be({ score: t }) {
  return jsx("div", { className: `w-16 h-16 rounded-full border-4 flex items-center justify-center ${t >= 80 ? "text-green-600 border-green-500" : t >= 60 ? "text-yellow-600 border-yellow-500" : t >= 40 ? "text-orange-600 border-orange-500" : "text-red-600 border-red-500"}`, children: jsx("span", { className: "text-xl font-bold", children: t }) });
}
function V({ name: t, present: a, optional: n = false }) {
  return jsxs("div", { className: `flex items-center gap-2 p-3 rounded-lg border ${a ? "bg-green-50 border-green-200" : n ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`, children: [jsx("span", { className: `w-5 h-5 rounded-full flex items-center justify-center text-xs ${a ? "bg-green-500 text-white" : n ? "bg-gray-300 text-gray-600" : "bg-red-500 text-white"}`, children: a ? "\u2713" : n ? "\u2212" : "\xD7" }), jsx("span", { className: `text-sm font-medium ${a ? "text-green-800" : "text-gray-700"}`, children: t })] });
}
function qe({ finding: t, domain: a, suggestions: n }) {
  const [o, i] = useState(false), l = { critical: "bg-red-600", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500", info: "bg-gray-400" };
  return jsxs("div", { className: `border rounded-lg overflow-hidden ${t.reviewOnly ? "border-amber-300 bg-amber-50" : "border-gray-200"}`, children: [jsx("button", { type: "button", onClick: () => i(!o), "aria-expanded": o, className: "focus-ring w-full px-4 py-3 text-left hover:bg-black/5 transition-colors duration-150", children: jsxs("div", { className: "flex items-start gap-3", children: [jsx("span", { className: `flex-shrink-0 w-2 h-2 rounded-full mt-2 ${l[t.severity] || "bg-gray-400"}`, "aria-hidden": "true" }), jsxs("div", { className: "flex-1 min-w-0", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("h5", { className: "font-medium text-gray-900", children: t.title }), t.reviewOnly && jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800", children: "Review Required" })] }), jsx("p", { className: "text-sm text-gray-600 mt-1 line-clamp-2", children: t.description }), jsxs("div", { className: "flex items-center gap-3 mt-2 text-xs text-gray-500", children: [jsxs("span", { className: "capitalize", children: [t.confidence, " confidence"] }), n.length > 0 && jsxs("span", { children: [n.length, " suggestion(s)"] })] })] }), jsx("svg", { className: `w-5 h-5 text-gray-400 transition-transform duration-150 ${o ? "rotate-180" : ""}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }) }), o && jsxs("div", { className: "px-4 pb-4 border-t border-gray-200/50 bg-white", children: [t.evidence && t.evidence.length > 0 && jsxs("div", { className: "mt-3", children: [jsx("h6", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2", children: "Evidence" }), jsx("ul", { className: "space-y-1", children: t.evidence.map((u) => jsxs("li", { className: "text-sm text-gray-600", children: ["\u2022 ", u.description] }, u.description)) })] }), n.length > 0 && jsxs("div", { className: "mt-4 space-y-3", children: [jsx("h6", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wider", children: "Suggestions" }), n.map((u) => jsx(Ve, { suggestion: u, domain: a }, u.id))] }), jsxs("div", { className: "mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400", children: ["Rule: ", t.ruleId, " \xB7 Version: ", t.ruleVersion] })] })] });
}
function ze(t) {
  return t.reduce((a, n) => {
    const o = n.severity;
    return a[o] || (a[o] = []), a[o].push(n), a;
  }, {});
}
function Ve({ suggestion: t, domain: a }) {
  const [n, o] = useState(false), [i, l] = useState(false), [u, d] = useState(false), s = !t.appliedAt && !t.dismissedAt, p = async () => {
    if (t.reviewOnly && !n) {
      o(true);
      return;
    }
    l(true);
    try {
      const m = await fetch(`/api/suggestions/${t.id}/apply`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmApply: t.reviewOnly ? true : void 0 }) });
      if (!m.ok) {
        const y = await m.json();
        throw m.status === 403 && y.code === "REQUIRES_CONFIRMATION" && console.warn("[MailFindingsPanel] Review-only suggestion applied without confirmation flag"), new Error(y.error || "Failed to apply suggestion");
      }
      t.reviewOnly && console.warn(`[MailFindingsPanel] Review-only suggestion applied for ${a}:`, t.id), window.location.reload();
    } catch (m) {
      console.error("Failed to apply suggestion:", m), l(false), o(false);
    }
  }, c = async () => {
    d(true);
    try {
      if (!(await fetch(`/api/suggestions/${t.id}/dismiss`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Dismissed by user" }) })).ok) throw new Error("Failed to dismiss suggestion");
      window.location.reload();
    } catch (m) {
      console.error("Failed to dismiss suggestion:", m), d(false);
    }
  };
  return jsxs(Fragment, { children: [jsxs("div", { className: `p-3 rounded-lg ${t.reviewOnly ? "bg-amber-100/50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`, children: [jsx("div", { className: "flex items-start justify-between gap-3", children: jsxs("div", { className: "flex-1", children: [jsxs("div", { className: "flex items-center gap-2", children: [jsx("h6", { className: "font-medium text-gray-900", children: t.title }), t.reviewOnly && jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800", children: "\u26A0\uFE0F Review Required" })] }), jsx("p", { className: "text-sm text-gray-600 mt-1", children: t.description }), jsx("div", { className: "mt-2 p-2 bg-white/50 rounded text-sm font-mono text-gray-700 whitespace-pre-wrap", children: t.action })] }) }), s && jsxs("div", { className: "mt-3 flex items-center gap-2 pt-2 border-t border-gray-200/50", children: [jsx("button", { type: "button", onClick: p, disabled: i || u, className: "inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: i ? "Applying..." : "Apply" }), jsx("button", { type: "button", onClick: c, disabled: i || u, className: "inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500", children: u ? "Dismissing..." : "Dismiss" })] }), t.appliedAt && jsxs("div", { className: "mt-2 pt-2 border-t border-gray-200/50 text-xs text-green-600", children: ["\u2713 Applied ", t.appliedBy ? `by ${t.appliedBy}` : ""] }), t.dismissedAt && jsxs("div", { className: "mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500", children: ["Dismissed ", t.dismissedBy ? `by ${t.dismissedBy}` : ""] })] }), jsx(Le, { isOpen: n, title: "Apply Review-Only Suggestion?", message: jsxs("div", { className: "space-y-3", children: [jsxs("p", { children: ["This suggestion is marked as ", jsx("strong", { children: "review-required" }), " because it may have significant impact:"] }), jsxs("ul", { className: "list-disc list-inside text-sm text-gray-600", children: [jsxs("li", { children: ["Risk posture: ", t.riskPosture] }), jsxs("li", { children: ["Blast radius: ", t.blastRadius.replace(/-/g, " ")] })] }), jsxs("p", { className: "text-amber-700 font-medium", children: ["This change may affect mail delivery for ", a, ". Proceed with caution."] })] }), confirmLabel: "Apply Anyway", cancelLabel: "Cancel", variant: "warning", onConfirm: p, onCancel: () => o(false) })] });
}
function Ue({ result: t }) {
  return jsxs("div", { className: "space-y-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Mail Check Results" }), jsx(Q, { label: "DMARC", present: t.dmarc.present, valid: t.dmarc.valid, errors: t.dmarc.errors, description: "Domain-based Message Authentication, Reporting, and Conformance" }), jsx(Q, { label: "DKIM", present: t.dkim.present, valid: t.dkim.valid, errors: t.dkim.errors, description: "DomainKeys Identified Mail", extra: t.dkim.present ? jsxs("span", { className: "text-xs text-gray-500", children: ["Selector: ", jsx("code", { className: "bg-gray-100 px-1 rounded", children: t.dkim.selector }), t.dkim.selectorProvenance && jsxs("span", { className: "ml-2 text-gray-400", children: ["(via ", t.dkim.selectorProvenance, ")"] })] }) : null }), jsx(Q, { label: "SPF", present: t.spf.present, valid: t.spf.valid, errors: t.spf.errors, description: "Sender Policy Framework" })] });
}
function Q({ label: t, present: a, valid: n, errors: o, description: i, extra: l }) {
  const s = { success: { icon: Ke, bg: "bg-green-50", border: "border-green-200", text: "text-green-800", label: "Present & Valid" }, warning: { icon: We, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", label: "Present but Invalid" }, error: { icon: Ye, bg: "bg-red-50", border: "border-red-200", text: "text-red-800", label: "Not Found" } }[a ? n ? "success" : "warning" : "error"], p = s.icon;
  return jsxs("div", { className: `p-4 rounded-lg border ${s.bg} ${s.border}`, children: [jsxs("div", { className: "flex items-start justify-between", children: [jsxs("div", { className: "flex items-center gap-3", children: [jsx(p, { className: `w-5 h-5 ${s.text}` }), jsxs("div", { children: [jsx("h4", { className: `font-medium ${s.text}`, children: t }), jsx("p", { className: "text-sm text-gray-600", children: i }), l] })] }), jsx("span", { className: `text-sm font-medium ${s.text}`, children: s.label })] }), o && o.length > 0 && jsx("div", { className: "mt-3 text-sm text-red-700", children: o.map((c) => jsxs("p", { children: ["\u2022 ", c] }, c)) })] });
}
function Ke({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) });
}
function We({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) });
}
function Ye({ className: t }) {
  return jsx("svg", { className: t, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", focusable: "false", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) });
}
const He = { "dmarc-missing": "DMARC record not found", "dmarc-invalid": "DMARC record is invalid", "dkim-missing": "DKIM record not found", "dkim-invalid": "DKIM record is invalid", "spf-missing": "SPF record not found", "spf-invalid": "SPF record is invalid" };
function Je({ domain: t, snapshotId: a, issues: n, onClose: o, onSuccess: i }) {
  const [l, u] = useState(false), [d, s] = useState({}), p = useId(), c = `${p}-contact-email`, m = `${p}-contact-name`, y = `${p}-contact-phone`, S = `${p}-priority`, C = `${p}-notes`, [w, v] = useState({ contactEmail: "", contactName: "", contactPhone: "", priority: "medium", notes: "", selectedIssues: n }), D = (f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f), N = (f) => f ? /^\+?[\d\s-]{8,20}$/.test(f) : true, $ = () => {
    const f = {};
    return (!w.contactEmail || !D(w.contactEmail)) && (f.contactEmail = "Valid email address required"), (!w.contactName || w.contactName.length < 2) && (f.contactName = "Name must be at least 2 characters"), w.contactPhone && !N(w.contactPhone) && (f.contactPhone = "Valid phone number required (8-20 digits, optional + prefix)"), w.selectedIssues.length === 0 && (f.issues = "Select at least one issue to fix"), s(f), Object.keys(f).length === 0;
  }, A = async (f) => {
    if (f.preventDefault(), !!$()) {
      u(true), s({});
      try {
        const k = await fetch("/api/remediation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: t, snapshotId: a, contactEmail: w.contactEmail, contactName: w.contactName, contactPhone: w.contactPhone || void 0, priority: w.priority, issues: w.selectedIssues, notes: w.notes || void 0 }) });
        if (!k.ok) {
          const O = await k.json();
          throw new Error(O.error || "Failed to submit request");
        }
        i == null ? void 0 : i(), o();
      } catch (k) {
        s({ general: k instanceof Error ? k.message : "Failed to submit request" });
      } finally {
        u(false);
      }
    }
  }, g = (f) => {
    v((k) => ({ ...k, selectedIssues: k.selectedIssues.includes(f) ? k.selectedIssues.filter((O) => O !== f) : [...k.selectedIssues, f] }));
  };
  return jsxs("form", { onSubmit: A, className: "bg-white p-6 rounded-lg border space-y-4", children: [jsx("h4", { className: "font-semibold text-lg", children: "Request Remediation" }), jsxs("p", { className: "text-sm text-gray-600", children: ["Submit a request to fix mail configuration issues for ", jsx("strong", { children: t })] }), d.general && jsx("div", { className: "p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm", role: "alert", children: d.general }), jsxs("div", { children: [jsx("label", { htmlFor: c, className: "block text-sm font-medium text-gray-700", children: "Contact Email *" }), jsx("input", { id: c, type: "email", value: w.contactEmail, onChange: (f) => v((k) => ({ ...k, contactEmail: f.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "admin@example.com", autoComplete: "email" }), d.contactEmail && jsx("p", { className: "mt-1 text-sm text-red-600", children: d.contactEmail })] }), jsxs("div", { children: [jsx("label", { htmlFor: m, className: "block text-sm font-medium text-gray-700", children: "Contact Name *" }), jsx("input", { id: m, type: "text", value: w.contactName, onChange: (f) => v((k) => ({ ...k, contactName: f.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "John Doe", autoComplete: "name" }), d.contactName && jsx("p", { className: "mt-1 text-sm text-red-600", children: d.contactName })] }), jsxs("div", { children: [jsx("label", { htmlFor: y, className: "block text-sm font-medium text-gray-700", children: "Phone (optional)" }), jsx("input", { id: y, type: "tel", value: w.contactPhone, onChange: (f) => v((k) => ({ ...k, contactPhone: f.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "+1 555-123-4567", autoComplete: "tel" }), d.contactPhone && jsx("p", { className: "mt-1 text-sm text-red-600", children: d.contactPhone })] }), jsxs("div", { children: [jsx("label", { htmlFor: S, className: "block text-sm font-medium text-gray-700", children: "Priority" }), jsxs("select", { id: S, value: w.priority, onChange: (f) => v((k) => ({ ...k, priority: f.target.value })), className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", children: [jsx("option", { value: "low", children: "Low" }), jsx("option", { value: "medium", children: "Medium" }), jsx("option", { value: "high", children: "High" }), jsx("option", { value: "critical", children: "Critical" })] })] }), jsxs("fieldset", { children: [jsx("legend", { className: "block text-sm font-medium text-gray-700", children: "Issues to Fix *" }), jsx("div", { className: "mt-2 space-y-2", children: n.map((f) => {
    const k = `${p}-issue-${f}`;
    return jsxs("label", { htmlFor: k, className: "flex items-center", children: [jsx("input", { id: k, type: "checkbox", checked: w.selectedIssues.includes(f), onChange: () => g(f), className: "focus-ring rounded border-gray-300 text-blue-600" }), jsx("span", { className: "ml-2 text-sm text-gray-700", children: He[f] || f })] }, f);
  }) }), d.issues && jsx("p", { className: "mt-1 text-sm text-red-600", children: d.issues })] }), jsxs("div", { children: [jsx("label", { htmlFor: C, className: "block text-sm font-medium text-gray-700", children: "Additional Notes" }), jsx("textarea", { id: C, value: w.notes, onChange: (f) => v((k) => ({ ...k, notes: f.target.value })), rows: 3, className: "focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm", placeholder: "Any additional context..." })] }), jsxs("div", { className: "flex flex-wrap gap-3 pt-4", children: [jsx("button", { type: "submit", disabled: l, className: "focus-ring min-h-10 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400", children: l ? "Submitting..." : "Submit Request" }), jsx("button", { type: "button", onClick: o, className: "focus-ring min-h-10 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300", children: "Cancel" })] })] });
}
function Xe({ domain: t, snapshotId: a }) {
  const [n, o] = useState(false), [i, l] = useState(null), [u, d] = useState(null), [s, p] = useState(false), [c, m] = useState(false), y = async () => {
    o(true), d(null);
    try {
      const v = await fetch("/api/collect/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: t, snapshotId: a }) });
      if (!v.ok) {
        const N = await v.json();
        throw v.status === 401 || v.status === 403 ? new Error("Operator sign-in is required to run mail diagnostics.") : new Error(N.error || "Mail check failed");
      }
      const D = await v.json();
      l(D.results || null), m(false);
    } catch (v) {
      d(v instanceof Error ? v.message : "Unknown error");
    } finally {
      o(false);
    }
  }, C = i ? ((v) => {
    const D = [];
    return v.dmarc.present ? v.dmarc.valid || D.push("dmarc-invalid") : D.push("dmarc-missing"), v.dkim.present ? v.dkim.valid || D.push("dkim-invalid") : D.push("dkim-missing"), v.spf.present ? v.spf.valid || D.push("spf-invalid") : D.push("spf-missing"), D;
  })(i) : [], w = C.length > 0;
  return i ? jsxs("div", { className: "space-y-6", children: [jsx(Ue, { result: i }), w && jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3", children: [jsxs("div", { children: [jsx("h4", { className: "font-semibold text-yellow-900 mb-2", children: "Issues Detected" }), jsxs("p", { className: "text-yellow-800 text-sm", children: ["Submit a tenant-scoped remediation request for the issues detected on", " ", jsx("strong", { children: t }), "."] })] }), c ? jsx("div", { className: "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800", children: "Remediation request submitted." }) : null, s ? jsx(Je, { domain: t, snapshotId: a, issues: C, onClose: () => p(false), onSuccess: () => {
    m(true), p(false);
  } }) : jsx("button", { type: "button", onClick: () => p(true), className: "focus-ring min-h-10 px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700", children: "Request Remediation" })] }), jsx("div", { className: "flex gap-3", children: jsx("button", { type: "button", onClick: y, disabled: n, "aria-busy": n, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: n ? "Checking..." : "Re-check" }) })] }) : jsxs("div", { className: "text-center py-12", children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Mail Configuration Check" }), jsxs("p", { className: "text-gray-500 mb-4", children: ["Check DMARC, DKIM, and SPF records for ", jsx("strong", { children: t })] }), u && jsx("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800", role: "alert", children: u }), jsx("button", { type: "button", onClick: y, disabled: n, "aria-busy": n, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: n ? "Checking..." : "Run Mail Check" })] });
}
function ne({ domainId: t, isDomainName: a = false }) {
  const [n, o] = useState(a ? null : t), [i, l] = useState(!a), [u, d] = useState([]), [s, p] = useState(true), [c, m] = useState(null), [y, S] = useState(false), [C, w] = useState(false), [v, D] = useState(null), [N, $] = useState(""), [A, g] = useState(""), [f, k] = useState(false), [O, x] = useState(false);
  useEffect(() => {
    if (!a) {
      o(t), l(true);
      return;
    }
    async function b() {
      var _a;
      l(false), m(null);
      try {
        const E = await fetch(`/api/portfolio/domains/by-name/${encodeURIComponent(t)}`, { credentials: "include" });
        if (E.status === 401) {
          S(true), o(null), p(false), l(true);
          return;
        }
        if (E.status === 403) {
          o(null), p(false), m("You do not have permission to view tenant notes for this domain."), l(true);
          return;
        }
        if (E.status === 404) {
          o(null), p(false), m("This domain must exist in the tenant portfolio before notes can be attached."), l(true);
          return;
        }
        if (!E.ok) {
          o(null), p(false), m("Failed to resolve domain context for notes"), l(true);
          return;
        }
        const z = await E.json();
        ((_a = z.domain) == null ? void 0 : _a.id) ? (S(false), o(z.domain.id), p(true)) : (o(null), p(false), m("Resolved domain response did not include a domain ID."));
      } catch {
        o(null), p(false), m("Failed to resolve domain context for notes");
      } finally {
        l(true);
      }
    }
    b();
  }, [t, a]);
  const I = useCallback(async () => {
    if (!n) {
      p(false);
      return;
    }
    p(true), m(null);
    try {
      const b = await fetch(`/api/portfolio/domains/${n}/notes`, { credentials: "include" });
      if (!b.ok) {
        if (b.status === 401) {
          S(true), d([]);
          return;
        }
        throw b.status === 403 ? (d([]), new Error("You do not have permission to view tenant notes.")) : new Error("Failed to fetch notes");
      }
      S(false);
      const E = await b.json();
      d((E.notes || []).map((z) => ({ ...z, author: z.author || z.createdBy || null })));
    } catch (b) {
      m(b instanceof Error ? b.message : "Failed to load notes");
    } finally {
      p(false);
    }
  }, [n]);
  useEffect(() => {
    n && I();
  }, [n, I]);
  const M = async () => {
    if (!(!A.trim() || !n)) {
      x(true);
      try {
        const b = await fetch(`/api/portfolio/domains/${n}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: A }), credentials: "include" });
        if (!b.ok) throw b.status === 401 ? (S(true), new Error("Operator sign-in is required to create notes.")) : b.status === 403 ? (w(true), new Error("You do not have permission to create tenant notes.")) : new Error("Failed to create note");
        S(false), g(""), k(false), await I();
      } catch (b) {
        m(b instanceof Error ? b.message : "Failed to create note");
      } finally {
        x(false);
      }
    }
  }, q = async (b) => {
    if (N.trim()) {
      x(true);
      try {
        const E = await fetch(`/api/portfolio/notes/${b}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: N }), credentials: "include" });
        if (!E.ok) throw E.status === 401 ? (S(true), new Error("Operator sign-in is required to update notes.")) : E.status === 403 ? (w(true), new Error("You do not have permission to update tenant notes.")) : new Error("Failed to update note");
        S(false), D(null), $(""), await I();
      } catch (E) {
        m(E instanceof Error ? E.message : "Failed to update note");
      } finally {
        x(false);
      }
    }
  }, B = async (b) => {
    if (confirm("Are you sure you want to delete this note?")) try {
      const E = await fetch(`/api/portfolio/notes/${b}`, { method: "DELETE", credentials: "include" });
      if (!E.ok) throw E.status === 401 ? (S(true), new Error("Operator sign-in is required to delete notes.")) : E.status === 403 ? (w(true), new Error("You do not have permission to delete tenant notes.")) : new Error("Failed to delete note");
      S(false), await I();
    } catch (E) {
      m(E instanceof Error ? E.message : "Failed to delete note");
    }
  }, R = (b) => {
    D(b.id), $(b.content);
  }, T = () => {
    D(null), $("");
  };
  return jsxs("div", { className: "rounded-lg border border-gray-200 bg-white shadow-sm", children: [jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 px-4 py-3", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Notes" }), !f && jsx("button", { type: "button", onClick: () => k(true), disabled: y || C, className: "text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400", children: "+ Add Note" })] }), jsxs("div", { className: "p-4", children: [y && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or edit tenant notes." }), C && jsx("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900", children: "You can view tenant notes here, but your current role cannot create, edit, or delete them." }), c && jsxs("div", { className: "mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800", children: [c, jsx("button", { type: "button", onClick: () => m(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), f && jsxs("div", { className: "mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3", children: [jsx("textarea", { value: A, onChange: (b) => g(b.target.value), placeholder: "Write your note...", rows: 3, disabled: y || C, className: "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" }), jsxs("div", { className: "mt-2 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: () => {
    k(false), g("");
  }, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: O || y || C, children: "Cancel" }), jsx("button", { type: "button", onClick: M, disabled: !A.trim() || O || y || C, className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: O ? "Saving..." : "Save Note" })] })] }), s ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Loading notes..." }) : y ? jsx("div", { className: "py-4 text-center text-gray-500", children: "Sign in to view and manage tenant notes." }) : !n && i ? jsx("div", { className: "py-4 text-center text-gray-500", children: c || "Notes are unavailable until domain context can be resolved." }) : u.length === 0 ? jsxs("div", { className: "py-4 text-center text-gray-500", children: ["No notes yet.", " ", !f && jsx("button", { type: "button", onClick: () => k(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: y || C, children: "Add one" })] }) : jsx("div", { className: "space-y-4", children: u.map((b) => jsx("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-3", children: v === b.id ? jsxs("div", { children: [jsx("textarea", { value: N, onChange: (E) => $(E.target.value), rows: 3, disabled: y || C, className: "w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" }), jsxs("div", { className: "mt-2 flex justify-end gap-2", children: [jsx("button", { type: "button", onClick: T, className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800", disabled: O || y, children: "Cancel" }), jsx("button", { type: "button", onClick: () => q(b.id), disabled: !N.trim() || O || y || C, className: "rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50", children: O ? "Saving..." : "Save" })] })] }) : jsxs("div", { children: [jsx("p", { className: "whitespace-pre-wrap text-gray-800", children: b.content }), jsxs("div", { className: "mt-2 flex items-center justify-between text-sm", children: [jsxs("div", { className: "text-gray-500", children: [b.author && jsx("span", { className: "mr-2", children: b.author }), jsx("span", { children: _e(b.updatedAt || b.createdAt) })] }), jsxs("div", { className: "flex gap-2", children: [jsx("button", { type: "button", onClick: () => R(b), className: "text-gray-500 hover:text-blue-600 disabled:text-gray-400", disabled: y || C, children: "Edit" }), jsx("button", { type: "button", onClick: () => B(b.id), className: "text-gray-500 hover:text-red-600 disabled:text-gray-400", disabled: y || C, children: "Delete" })] })] })] }) }, b.id)) })] })] });
}
function _e(t) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
const se = { low: "#16a34a", medium: "#d97706", high: "#dc2626" }, Qe = { critical: "#dc2626", high: "#ea580c", medium: "#d97706", low: "#2563eb", info: "#6b7280" }, Ze = { add: "Add", modify: "Modify", remove: "Remove" };
function Ge({ snapshotId: t }) {
  const [a, n] = useState(null), [o, i] = useState(false), [l, u$1] = useState(null), d = useCallback(async () => {
    if (t) {
      i(true), u$1(null);
      try {
        const s = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshotId: t }) });
        if (!s.ok) {
          let c = `Simulation failed (${s.status})`;
          try {
            const m = await s.json();
            m.error && (c = m.error);
          } catch {
          }
          throw new Error(c);
        }
        const p = await s.json();
        n(p);
      } catch (s) {
        u$1(s instanceof Error ? s.message : "Unknown error");
      } finally {
        i(false);
      }
    }
  }, [t]);
  return t ? o ? jsx(u, { message: "Running simulation..." }) : l ? jsx(p, { message: l, onRetry: d }) : a ? jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [jsxs("div", { style: { display: "flex", gap: "1rem", flexWrap: "wrap", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }, children: [jsx(K, { label: "Changes", value: a.summary.changesProposed }), jsx(K, { label: "Findings before", value: a.summary.findingsBefore }), jsx(K, { label: "After", value: a.summary.findingsAfter, color: a.summary.findingsAfter < a.summary.findingsBefore ? "#16a34a" : void 0 }), jsx(K, { label: "Resolved", value: a.summary.findingsResolved, color: "#16a34a" }), a.summary.findingsNew > 0 && jsx(K, { label: "New", value: a.summary.findingsNew, color: "#d97706" }), a.detectedProvider !== "unknown" && jsxs("span", { style: { padding: "0.25rem 0.75rem", backgroundColor: "#eff6ff", borderRadius: "9999px", fontSize: "0.75rem", color: "#2563eb" }, children: ["Provider: ", a.detectedProvider] })] }), a.proposedChanges.length > 0 && jsxs("section", { children: [jsx("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }, children: "Proposed DNS Changes" }), jsx("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: a.proposedChanges.map((s) => jsx(et, { change: s }, `${s.action}-${s.name}-${s.type}`)) })] }), a.resolvedFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#16a34a" }, children: ["\u2705 Findings Resolved (", a.resolvedFindings.length, ")"] }), jsx(Z, { findings: a.resolvedFindings })] }), a.newFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#d97706" }, children: ["\u26A0\uFE0F New Findings Introduced (", a.newFindings.length, ")"] }), jsx(Z, { findings: a.newFindings })] }), a.remainingFindings.length > 0 && jsxs("section", { children: [jsxs("h4", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "#6b7280" }, children: ["Remaining (", a.remainingFindings.length, ")"] }), jsx(Z, { findings: a.remainingFindings })] }), jsx("div", { style: { textAlign: "center" }, children: jsx("button", { type: "button", onClick: d, style: { padding: "0.375rem 1rem", backgroundColor: "transparent", color: "#2563eb", border: "1px solid #2563eb", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem" }, children: "Re-run Simulation" }) })] }) : jsxs("div", { style: { textAlign: "center", padding: "2rem" }, children: [jsx("p", { style: { color: "#6b7280", marginBottom: "1rem" }, children: "Simulate DNS changes to see which findings would be resolved." }), jsx("button", { type: "button", onClick: d, style: { padding: "0.5rem 1.5rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }, children: "Run Simulation" })] }) : jsx(x, { icon: "shield", title: "No snapshot available", description: "Collect data first, then simulate fixes.", size: "sm" });
}
function K({ label: t, value: a, color: n }) {
  return jsxs("span", { style: { padding: "0.25rem 0.75rem", backgroundColor: "#f1f5f9", borderRadius: "9999px", fontSize: "0.75rem" }, children: [t, ": ", jsx("strong", { style: { color: n || "inherit" }, children: a })] });
}
function et({ change: t }) {
  return jsxs("div", { style: { padding: "0.75rem 1rem", border: "1px solid #e2e8f0", borderRadius: "8px", borderLeft: `4px solid ${se[t.risk] || "#6b7280"}`, backgroundColor: "white" }, children: [jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }, children: [jsx("span", { style: { padding: "0.125rem 0.375rem", borderRadius: "4px", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", color: "white", backgroundColor: t.action === "add" ? "#16a34a" : t.action === "remove" ? "#dc2626" : "#d97706" }, children: Ze[t.action] }), jsxs("code", { style: { fontSize: "0.8125rem", fontWeight: 600 }, children: [t.name, " ", t.type] }), jsxs("span", { style: { fontSize: "0.625rem", color: se[t.risk], fontWeight: 600 }, children: [t.risk, " risk"] })] }), t.currentValues.length > 0 && jsxs("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: "#dc2626", backgroundColor: "#fef2f2", padding: "0.25rem 0.5rem", borderRadius: "4px", marginBottom: "0.25rem" }, children: ["\u2212 ", t.currentValues.join(", ")] }), t.proposedValues.length > 0 && jsxs("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: "#16a34a", backgroundColor: "#f0fdf4", padding: "0.25rem 0.5rem", borderRadius: "4px", marginBottom: "0.25rem" }, children: ["+ ", t.proposedValues.join(", ")] }), jsx("p", { style: { fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0" }, children: t.rationale })] });
}
function Z({ findings: t }) {
  return jsx("div", { style: { display: "flex", flexDirection: "column", gap: "0.25rem" }, children: t.map((a) => jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.75rem", backgroundColor: "#f8f8f8", borderRadius: "6px", fontSize: "0.8125rem" }, children: [jsx("span", { style: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: Qe[a.severity] || "#6b7280", flexShrink: 0 } }), jsx("span", { style: { color: "#374151" }, children: a.title }), jsx("span", { style: { fontSize: "0.625rem", color: "#9ca3af", marginLeft: "auto" }, children: a.severity })] }, `${a.type}-${a.severity}`)) });
}
function tt({ domain: t }) {
  const [a, n] = useState([]), [o, i] = useState(true), [l, u$1] = useState(null), [d, s] = useState(null), [p$1, c] = useState(null), [m, y] = useState(null), [S, C] = useState(false), [w, v] = useState(null), D = useCallback(async () => {
    var _a;
    i(true), u$1(null);
    try {
      const g = await fetch(`/api/snapshots/${encodeURIComponent(t)}?limit=50`);
      if (!g.ok) {
        if (g.status === 404) {
          n([]);
          return;
        }
        throw new Error(`Failed to load snapshots: ${g.status} ${g.statusText}`);
      }
      const f = await g.json();
      n((_a = f.snapshots) != null ? _a : []);
    } catch (g) {
      u$1(g instanceof Error ? g.message : "Unknown error");
    } finally {
      i(false);
    }
  }, [t]);
  useEffect(() => {
    D();
  }, [D]);
  const N = useCallback(async () => {
    var _a;
    if (!(!d || !p$1)) {
      C(true), v(null), y(null);
      try {
        const g = await fetch(`/api/snapshots/${encodeURIComponent(t)}/diff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshotA: d, snapshotB: p$1 }) });
        if (!g.ok) {
          const f = await g.json().catch(() => ({}));
          throw new Error((_a = f.error) != null ? _a : `Diff failed: ${g.status}`);
        }
        y(await g.json());
      } catch (g) {
        v(g instanceof Error ? g.message : "Unknown error");
      } finally {
        C(false);
      }
    }
  }, [t, d, p$1]), $ = useCallback(async () => {
    var _a;
    C(true), v(null), y(null);
    try {
      const g = await fetch(`/api/snapshots/${encodeURIComponent(t)}/compare-latest`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!g.ok) {
        const f = await g.json().catch(() => ({}));
        throw new Error((_a = f.error) != null ? _a : `Compare latest failed: ${g.status}`);
      }
      y(await g.json());
    } catch (g) {
      v(g instanceof Error ? g.message : "Unknown error");
    } finally {
      C(false);
    }
  }, [t]), A = useCallback(() => {
    y(null), v(null);
  }, []);
  return o ? jsx("div", { "data-testid": "snapshot-history-loading", children: jsx(u, { message: "Loading snapshot history\u2026" }) }) : l ? jsx("div", { "data-testid": "snapshot-history-error", children: jsx(p, { message: l, onRetry: D }) }) : a.length === 0 ? jsx("div", { "data-testid": "snapshot-history-empty", children: jsx(x, { icon: "document", title: "No snapshots yet", description: "Collect DNS evidence to start building snapshot history.", size: "sm" }) }) : jsxs("div", { className: "space-y-6", "data-testid": "snapshot-history-panel", children: [jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Snapshot History" }), jsxs("p", { className: "text-sm text-gray-500", children: [a.length, " snapshot", a.length !== 1 ? "s" : "", " collected"] })] }), jsxs("div", { className: "flex gap-2", children: [a.length >= 2 && jsx("button", { type: "button", onClick: $, disabled: S, className: "focus-ring px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", "data-testid": "compare-latest-btn", children: S ? "Comparing\u2026" : "Compare Latest" }), jsx("button", { type: "button", onClick: N, disabled: S || !d || !p$1 || d === p$1, className: "focus-ring px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", "data-testid": "compare-selected-btn", children: "Compare Selected" })] })] }), jsx("div", { className: "overflow-x-auto border border-gray-200 rounded-lg", children: jsxs("table", { className: "min-w-full text-sm", "data-testid": "snapshot-list-table", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-2 text-left font-medium", children: "A" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "B" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Created" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Ruleset" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Findings" }), jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Scope" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: a.map((g) => jsxs("tr", { className: `hover:bg-gray-50 ${d === g.id || p$1 === g.id ? "bg-blue-50" : ""}`, children: [jsx("td", { className: "px-3 py-2", children: jsx("input", { type: "radio", name: "snapshotA", checked: d === g.id, onChange: () => s(g.id), "aria-label": `Select snapshot ${g.id.slice(0, 8)} as A (older)`, className: "accent-blue-600" }) }), jsx("td", { className: "px-3 py-2", children: jsx("input", { type: "radio", name: "snapshotB", checked: p$1 === g.id, onChange: () => c(g.id), "aria-label": `Select snapshot ${g.id.slice(0, 8)} as B (newer)`, className: "accent-blue-600" }) }), jsx("td", { className: "px-3 py-2 tabular-nums whitespace-nowrap", children: new Date(g.createdAt).toLocaleString() }), jsx("td", { className: "px-3 py-2 font-mono text-xs", children: g.rulesetVersionId ? g.rulesetVersionId.slice(0, 8) : "\u2014" }), jsx("td", { className: "px-3 py-2", children: g.findingsEvaluated ? jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800", children: "Evaluated" }) : jsx("span", { className: "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600", children: "Pending" }) }), jsxs("td", { className: "px-3 py-2 text-xs text-gray-500", children: [g.queryScope.names.length, " names, ", g.queryScope.types.length, " types"] })] }, g.id)) })] }) }), w && jsx("div", { className: "p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700", role: "alert", "data-testid": "diff-error", children: w }), S && jsx("div", { "data-testid": "diff-loading", children: jsx(u, { message: "Computing snapshot diff\u2026", size: "sm" }) }), m && jsx(rt, { result: m, onClose: A })] });
}
function rt({ result: t, onClose: a }) {
  const { diff: n, warnings: o } = t, { findingsSummary: i, comparison: l } = n, u = l.recordChanges.filter((s) => s.type !== "unchanged"), d = { added: l.recordChanges.filter((s) => s.type === "added").length, removed: l.recordChanges.filter((s) => s.type === "removed").length, modified: l.recordChanges.filter((s) => s.type === "modified").length, unchanged: l.recordChanges.filter((s) => s.type === "unchanged").length };
  return jsxs("div", { className: "space-y-4", "data-testid": "diff-result", children: [jsxs("div", { className: "flex items-center justify-between", children: [jsx("h4", { className: "font-semibold text-gray-900", children: "Comparison Result" }), jsx("button", { type: "button", onClick: a, className: "text-sm text-gray-500 hover:text-gray-700", "data-testid": "close-diff-btn", children: "\u2715 Close" })] }), jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm", children: [jsxs("div", { className: "rounded-lg bg-gray-50 p-3", children: [jsx("p", { className: "font-medium text-gray-700", children: "Snapshot A (older)" }), jsx("p", { className: "text-xs text-gray-500 tabular-nums", children: new Date(n.snapshotA.createdAt).toLocaleString() }), jsxs("p", { className: "text-xs text-gray-500 font-mono", children: ["Ruleset: ", n.snapshotA.rulesetVersion.slice(0, 8)] })] }), jsxs("div", { className: "rounded-lg bg-gray-50 p-3", children: [jsx("p", { className: "font-medium text-gray-700", children: "Snapshot B (newer)" }), jsx("p", { className: "text-xs text-gray-500 tabular-nums", children: new Date(n.snapshotB.createdAt).toLocaleString() }), jsxs("p", { className: "text-xs text-gray-500 font-mono", children: ["Ruleset: ", n.snapshotB.rulesetVersion.slice(0, 8)] })] })] }), o && o.length > 0 && jsxs("div", { className: "p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800", "data-testid": "diff-warnings", children: [jsx("p", { className: "font-medium mb-1", children: "\u26A0 Warnings" }), jsx("ul", { className: "list-disc list-inside space-y-1", children: o.map((s) => jsx("li", { children: s }, s)) })] }), jsxs("div", { children: [jsx("h5", { className: "text-xs font-medium uppercase tracking-wide text-gray-500 mb-2", children: "DNS Records" }), jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", "data-testid": "diff-summary", children: [jsx(J, { label: "Added", value: d.added, color: "green" }), jsx(J, { label: "Removed", value: d.removed, color: "red" }), jsx(J, { label: "Modified", value: d.modified, color: "yellow" }), jsx(J, { label: "Unchanged", value: d.unchanged, color: "gray" })] })] }), l.scopeChanges && jsxs("div", { className: "p-3 rounded-lg border border-orange-200 bg-orange-50 text-sm", "data-testid": "scope-changes", children: [jsx("p", { className: "font-medium text-orange-800 mb-1", children: "Scope Changed" }), jsx("p", { className: "text-orange-700", children: l.scopeChanges.message })] }), l.rulesetChange && jsxs("div", { className: "p-3 rounded-lg border border-purple-200 bg-purple-50 text-sm", "data-testid": "ruleset-changes", children: [jsx("p", { className: "font-medium text-purple-800 mb-1", children: "Ruleset Changed" }), jsx("p", { className: "text-purple-700", children: l.rulesetChange.message })] }), u.length > 0 && jsx(G, { title: "Record Changes", testId: "record-changes", children: jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full text-sm", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Change" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Name" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Type" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Values" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: u.map((s) => {
    var _a, _b, _c, _d, _e2, _f;
    return jsxs("tr", { children: [jsx("td", { className: "px-3 py-1.5", children: jsx(ie, { type: s.type }) }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: s.name }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: s.recordType }), jsxs("td", { className: "px-3 py-1.5 text-xs", children: [s.type === "added" && ((_a = s.valuesB) == null ? void 0 : _a.join(", ")), s.type === "removed" && jsx("span", { className: "line-through text-gray-400", children: (_b = s.valuesA) == null ? void 0 : _b.join(", ") }), s.type === "modified" && jsxs("span", { children: [jsx("span", { className: "line-through text-red-400 mr-1", children: (_d = (_c = s.diff) == null ? void 0 : _c.removed) == null ? void 0 : _d.join(", ") }), jsx("span", { className: "text-green-700", children: (_f = (_e2 = s.diff) == null ? void 0 : _e2.added) == null ? void 0 : _f.join(", ") })] })] })] }, `${s.name}-${s.recordType}-${s.type}`);
  }) })] }) }) }), l.ttlChanges.length > 0 && jsx(G, { title: "TTL Changes", testId: "ttl-changes", children: jsx("div", { className: "overflow-x-auto", children: jsxs("table", { className: "min-w-full text-sm", children: [jsx("thead", { className: "bg-gray-50 text-gray-600", children: jsxs("tr", { children: [jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Name" }), jsx("th", { className: "px-3 py-1.5 text-left font-medium", children: "Type" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "Before" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "After" }), jsx("th", { className: "px-3 py-1.5 text-right font-medium", children: "\u0394" })] }) }), jsx("tbody", { className: "divide-y divide-gray-100", children: l.ttlChanges.map((s) => jsxs("tr", { children: [jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: s.name }), jsx("td", { className: "px-3 py-1.5 font-mono text-xs", children: s.recordType }), jsxs("td", { className: "px-3 py-1.5 text-right tabular-nums", children: [s.ttlA, "s"] }), jsxs("td", { className: "px-3 py-1.5 text-right tabular-nums", children: [s.ttlB, "s"] }), jsxs("td", { className: `px-3 py-1.5 text-right tabular-nums ${s.change > 0 ? "text-green-700" : "text-red-700"}`, children: [s.change > 0 ? "+" : "", s.change, "s"] })] }, `${s.name}-${s.recordType}`)) })] }) }) }), i.totalChanges > 0 && jsx(G, { title: "Finding Changes", testId: "finding-changes", children: jsxs("div", { className: "space-y-2", children: [jsxs("div", { className: "flex gap-3 text-xs text-gray-500 mb-2", children: [jsxs("span", { children: ["+", i.added, " added"] }), jsxs("span", { children: ["\u2212", i.removed, " removed"] }), jsxs("span", { children: ["~", i.modified, " modified"] })] }), l.findingChanges.filter((s) => s.type !== "unchanged").map((s) => jsxs("div", { className: "flex items-start gap-2 p-2 rounded border border-gray-100", children: [jsx(ie, { type: s.type }), jsxs("div", { children: [jsx("p", { className: "text-sm font-medium text-gray-900", children: s.title }), jsxs("p", { className: "text-xs text-gray-500", children: [s.findingType, s.severityA && s.severityB && s.severityA !== s.severityB ? ` \xB7 severity ${s.severityA} \u2192 ${s.severityB}` : s.severityB ? ` \xB7 ${s.severityB}` : ""] }), s.description && jsx("p", { className: "text-xs text-gray-400 mt-0.5", children: s.description })] })] }, `${s.findingType}-${s.type}`))] }) }), u.length === 0 && l.ttlChanges.length === 0 && i.totalChanges === 0 && jsx("div", { className: "text-center py-6 text-gray-500 text-sm", "data-testid": "no-changes", children: "No record or finding changes detected between these snapshots." })] });
}
function J({ label: t, value: a, color: n }) {
  return jsxs("div", { className: `${{ green: "bg-green-50", red: "bg-red-50", yellow: "bg-yellow-50", gray: "bg-gray-50" }[n]} rounded-lg p-3 text-center`, children: [jsx("div", { className: "text-xl font-bold text-gray-900 tabular-nums", children: a }), jsx("div", { className: "text-xs text-gray-600", children: t })] });
}
function ie({ type: t }) {
  var _a, _b;
  const a = { added: "bg-green-100 text-green-800", removed: "bg-red-100 text-red-800", modified: "bg-yellow-100 text-yellow-800", unchanged: "bg-gray-100 text-gray-600" }, n = { added: "+", removed: "\u2212", modified: "~", unchanged: "=" };
  return jsx("span", { className: `inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${(_a = a[t]) != null ? _a : a.unchanged}`, children: (_b = n[t]) != null ? _b : "?" });
}
function G({ title: t, testId: a, children: n }) {
  return jsxs("div", { "data-testid": a, children: [jsx("h5", { className: "font-medium text-gray-900 mb-2", children: t }), n] });
}
function oe({ children: t, color: a }) {
  return jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{ gray: "bg-gray-100 text-gray-800", green: "bg-green-100 text-green-800", yellow: "bg-yellow-100 text-yellow-800", red: "bg-red-100 text-red-800", blue: "bg-blue-100 text-blue-800", purple: "bg-purple-100 text-purple-800", orange: "bg-orange-100 text-orange-800" }[a]}`, children: t });
}
function at({ type: t }) {
  const a = { managed: { color: "green", label: "Managed Zone" }, unmanaged: { color: "yellow", label: "Unmanaged (Targeted)" }, unknown: { color: "gray", label: "Unknown" } }, { color: n, label: o } = a[t];
  return jsx(oe, { color: n, children: o });
}
function nt({ state: t }) {
  const a = { complete: { color: "green", label: "Complete" }, partial: { color: "yellow", label: "Partial" }, failed: { color: "red", label: "Failed" } }, { color: n, label: o } = a[t];
  return jsx(oe, { color: n, children: o });
}
function le({ domainId: t, isDomainName: a = false, onTagsChange: n }) {
  const [o, i] = useState([]), [l, u] = useState([]), [d, s] = useState(true), [p, c] = useState(null), [m, y] = useState(false), [S, C] = useState(false), [w, v] = useState(""), [D, N] = useState(false), [$, A] = useState(false), [g, f] = useState(a ? null : t), [k, O] = useState(!a);
  useEffect(() => {
    if (!a) {
      f(t);
      return;
    }
    async function R() {
      var _a;
      O(false), c(null);
      try {
        const T = await fetch(`/api/portfolio/domains/by-name/${encodeURIComponent(t)}`, { credentials: "include" });
        if (T.status === 401) {
          y(true), f(null), s(false), O(true);
          return;
        }
        if (T.status === 403) {
          f(null), s(false), c("You do not have permission to view tenant tags for this domain."), O(true);
          return;
        }
        if (T.status === 404) {
          f(null), s(false), c("This domain must exist in the tenant portfolio before tags can be attached."), O(true);
          return;
        }
        if (!T.ok) {
          f(null), s(false), c("Failed to resolve domain context for tags"), O(true);
          return;
        }
        const b = await T.json();
        ((_a = b.domain) == null ? void 0 : _a.id) ? (y(false), f(b.domain.id), s(true)) : (f(null), s(false), c("Resolved domain response did not include a domain ID."));
      } catch {
        f(null), s(false), c("Failed to resolve domain context for tags");
      } finally {
        O(true);
      }
    }
    R();
  }, [t, a]), useEffect(() => {
    async function R() {
      try {
        const T = await fetch("/api/portfolio/tags", { credentials: "include" });
        if (T.status === 401) {
          y(true), u([]);
          return;
        }
        if (T.status === 403) {
          u([]);
          return;
        }
        if (T.ok) {
          y(false);
          const b = await T.json();
          u(b.tags || []);
        }
      } catch {
      }
    }
    R();
  }, []);
  const x = useCallback(async () => {
    if (!g) {
      s(false);
      return;
    }
    s(true), c(null);
    try {
      const R = await fetch(`/api/portfolio/domains/${g}/tags`, { credentials: "include" });
      if (!R.ok) {
        if (R.status === 401) {
          y(true), i([]);
          return;
        }
        throw R.status === 403 ? (i([]), new Error("You do not have permission to view tenant tags.")) : new Error("Failed to fetch tags");
      }
      y(false);
      const b = ((await R.json()).tags || []).map((E) => typeof E == "string" ? E : E.tag);
      i(b), n == null ? void 0 : n(b);
    } catch (R) {
      c(R instanceof Error ? R.message : "Failed to load tags");
    } finally {
      s(false);
    }
  }, [g, n]);
  useEffect(() => {
    g && x();
  }, [g, x]);
  const I = async (R = w) => {
    const T = R.trim().toLowerCase();
    if (!(!T || !g || o.includes(T))) {
      A(true);
      try {
        const b = await fetch(`/api/portfolio/domains/${g}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag: T }), credentials: "include" });
        if (!b.ok) throw b.status === 401 ? (y(true), new Error("Operator sign-in is required to add tags.")) : b.status === 403 ? (C(true), new Error("You do not have permission to add tenant tags.")) : new Error("Failed to add tag");
        y(false), v(""), N(false), await x();
      } catch (b) {
        c(b instanceof Error ? b.message : "Failed to add tag");
      } finally {
        A(false);
      }
    }
  }, M = async (R) => {
    if (g) try {
      const T = await fetch(`/api/portfolio/domains/${g}/tags/${encodeURIComponent(R)}`, { method: "DELETE", credentials: "include" });
      if (!T.ok) throw T.status === 401 ? (y(true), new Error("Operator sign-in is required to remove tags.")) : T.status === 403 ? (C(true), new Error("You do not have permission to remove tenant tags.")) : new Error("Failed to remove tag");
      y(false), await x();
    } catch (T) {
      c(T instanceof Error ? T.message : "Failed to remove tag");
    }
  }, q = (R) => {
    R.key === "Enter" ? (R.preventDefault(), I()) : R.key === "Escape" && (N(false), v(""));
  }, B = l.filter((R) => !o.includes(R));
  return jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: [jsxs("div", { className: "px-4 py-3 border-b border-gray-200 flex items-center justify-between", children: [jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Tags" }), !D && jsx("button", { type: "button", onClick: () => N(true), disabled: m || S, className: "text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400", children: "+ Add Tag" })] }), jsxs("div", { className: "p-4", children: [m && jsx("div", { className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900", children: "Operator sign-in is required to view or edit tenant tags." }), S && jsx("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900", children: "You can view tenant tags here, but your current role cannot add or remove them." }), p && jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm", children: [p, jsx("button", { type: "button", onClick: () => c(null), className: "ml-2 text-red-600 hover:text-red-800", children: "Dismiss" })] }), D && jsxs("div", { className: "mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200", children: [jsxs("div", { className: "flex gap-2", children: [jsx("input", { type: "text", value: w, onChange: (R) => v(R.target.value), onKeyDown: q, placeholder: "Enter tag name...", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100", disabled: m || S }), jsx("button", { type: "button", onClick: () => I(), disabled: !w.trim() || $ || m || S, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50", children: $ ? "Adding..." : "Add" }), jsx("button", { type: "button", onClick: () => {
    N(false), v("");
  }, className: "px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400", disabled: $ || m || S, children: "Cancel" })] }), B.length > 0 && jsxs("div", { className: "mt-3", children: [jsx("span", { className: "text-sm text-gray-500", children: "Suggestions:" }), jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: B.slice(0, 10).map((R) => jsx("button", { type: "button", onClick: () => I(R), disabled: $ || m || S, className: "px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50", children: R }, R)) })] })] }), d ? jsx("div", { className: "text-center text-gray-500 py-4", children: "Loading tags..." }) : m ? jsx("div", { className: "text-center text-gray-500 py-4", children: "Sign in to view and manage tenant tags." }) : !g && k ? jsx("div", { className: "text-center text-gray-500 py-4", children: p || "Tags are unavailable until domain context can be resolved." }) : o.length === 0 ? jsxs("div", { className: "text-center text-gray-500 py-4", children: ["No tags yet.", " ", !D && jsx("button", { type: "button", onClick: () => N(true), className: "text-blue-600 hover:text-blue-700 disabled:text-gray-400", disabled: m || S, children: "Add one" })] }) : jsx("div", { className: "flex flex-wrap gap-2", children: o.map((R) => jsxs("span", { className: "inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm", children: [R, jsx("button", { type: "button", onClick: () => M(R), className: "hover:bg-blue-200 rounded-full p-0.5 disabled:text-gray-400 disabled:hover:bg-transparent", disabled: m || S, "aria-label": `Remove ${R} tag`, children: jsx("svg", { "aria-hidden": "true", className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, R)) })] })] });
}
const de = ye$1(), st = Dt(), F = [{ id: "overview", label: "Overview" }, { id: "dns", label: "DNS" }, { id: "mail", label: "Mail" }, { id: "history", label: "History" }, ...de ? [{ id: "delegation", label: "Delegation" }] : []];
function it({ domain: t, snapshot: a, observations: n }) {
  if (!a) return jsxs("div", { className: "space-y-6", children: [jsx("div", { className: "text-center py-12", children: jsxs("p", { className: "text-gray-500", children: ["No DNS evidence available yet for ", t, "."] }) }), jsxs("div", { className: "space-y-4", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Operator Context" }), jsx("p", { className: "text-sm text-gray-500", children: "Keep tenant-scoped notes and tags attached to the domain even before the next evidence refresh." })] }), jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [jsx(ne, { domainId: t, isDomainName: true }), jsx(le, { domainId: t, isDomainName: true })] })] })] });
  const o = n.filter((l) => l.status === "success").length, i = n.length - o;
  return jsxs("div", { className: "space-y-6", children: [jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [jsx(ee, { label: "Total Queries", value: n.length }), jsx(ee, { label: "Successful", value: o, color: "green" }), jsx(ee, { label: "Errors/Timeouts", value: i, color: i > 0 ? "red" : "gray" })] }), st && jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Fix Simulation" }), jsx("p", { className: "text-sm text-gray-500 mb-3", children: "Simulate DNS changes to see which findings would be resolved." }), jsx(Ge, { snapshotId: a.id })] }), jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [jsx("h3", { className: "font-semibold text-blue-900 mb-3", children: "Query Scope" }), jsxs("div", { className: "space-y-3", children: [jsx(te, { label: "Names", values: a.queriedNames || [] }), jsx(te, { label: "Types", values: a.queriedTypes || [] }), jsx(te, { label: "Vantages", values: a.vantages || [] })] }), a.zoneManagement === "unmanaged" ? jsx("p", { className: "mt-3 text-xs text-blue-700", children: "Targeted inspection mode: this is a DNS evidence snapshot, not a full zone enumeration." }) : null] }), jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Snapshot Metadata" }), jsxs("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm", children: [jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Created" }), jsx("dd", { className: "text-gray-900 tabular-nums", children: new Date(a.createdAt).toLocaleString() })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Duration" }), jsx("dd", { className: "text-gray-900 tabular-nums", children: a.collectionDurationMs ? `${a.collectionDurationMs}ms` : "N/A" })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Triggered By" }), jsx("dd", { className: "text-gray-900", children: a.triggeredBy || "Unknown" })] }), jsxs("div", { children: [jsx("dt", { className: "text-gray-500", children: "Ruleset" }), jsx("dd", { className: "text-gray-900", children: a.rulesetVersionId || "Pending evaluation" })] })] })] }), jsxs("div", { className: "space-y-4", children: [jsxs("div", { children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Operator Context" }), jsx("p", { className: "text-sm text-gray-500", children: "Keep tenant-scoped notes and tags attached to the domain alongside the latest DNS evidence." })] }), jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [jsx(ne, { domainId: t, isDomainName: true }), jsx(le, { domainId: t, isDomainName: true })] })] })] });
}
function lt({ observations: t }) {
  return t.length === 0 ? jsx("div", { className: "text-center py-12", children: jsx("p", { className: "text-gray-500", children: "No DNS observations available yet. Refresh to collect DNS data." }) }) : jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "DNS Records" }), jsx("p", { className: "text-sm text-gray-500", children: "View DNS evidence in Parsed, Raw, or Dig-style formats." })] }), jsx(Te, { observations: t })] });
}
function ot({ domain: t, snapshotId: a }) {
  return a ? jsxs("div", { className: "space-y-6", children: [jsxs("section", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Mail Security Analysis" }), jsx("p", { className: "text-sm text-gray-500", children: "Persisted mail configuration findings based on collected evidence." })] }), jsx(je, { snapshotId: a })] }), jsxs("section", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "DKIM Selectors" }), jsx("p", { className: "text-sm text-gray-500", children: "Discovered DKIM selectors with provenance and confidence levels." })] }), jsx(De, { snapshotId: a })] }), jsxs("section", { className: "border-t pt-4", children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Live Diagnostics" }), jsx("p", { className: "text-sm text-gray-500", children: "Run additional mail diagnostics to refresh and analyze current mail configuration." })] }), jsx(Xe, { domain: t, snapshotId: a })] })] }) : jsx("div", { className: "text-center py-12", "data-testid": "mail-no-snapshot-state", children: jsxs("p", { className: "text-gray-500", children: ["No DNS evidence available yet for ", t, ". Refresh to collect mail data."] }) });
}
function dt({ domain: t }) {
  return jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Snapshot History" }), jsxs("p", { className: "text-sm text-gray-500", children: ["View and compare past DNS snapshots to track changes over time for ", t, "."] })] }), jsx(tt, { domain: t })] });
}
function ct({ domain: t, snapshotId: a }) {
  return jsxs("div", { children: [jsxs("div", { className: "mb-4", children: [jsx("h3", { className: "font-semibold text-gray-900", children: "Delegation Analysis" }), jsxs("p", { className: "text-sm text-gray-500", children: ["View delegation status, name server configuration, and glue records for ", t, "."] })] }), jsx(ke, { snapshotId: a != null ? a : null })] });
}
function ee({ label: t, value: a, color: n = "gray" }) {
  return jsxs("div", { className: `${{ gray: "bg-gray-50", green: "bg-green-50", red: "bg-red-50" }[n]} rounded-lg p-4 text-center`, children: [jsx("div", { className: "text-2xl font-bold text-gray-900 tabular-nums", children: a }), jsx("div", { className: "text-sm text-gray-600", children: t })] });
}
function te({ label: t, values: a }) {
  return jsxs("div", { children: [jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-blue-700", children: t }), a.length > 0 ? jsx("div", { className: "mt-1 flex flex-wrap gap-1.5", children: a.map((n) => jsx("span", { className: "rounded-full bg-white/80 border border-blue-200 px-2 py-0.5 text-xs text-blue-900", children: n }, `${t}-${n}`)) }) : jsx("p", { className: "mt-1 text-sm text-blue-800", children: "N/A" })] });
}
const Ct = function() {
  const a = be$1.useLoaderData(), { domain: n } = a, { tab: o } = be$1.useSearch(), [i, l] = useState(o != null ? o : "overview"), [u, d] = useState(false), [s, p] = useState(null), [c, m] = useState(null), [y, S] = useState([]), [C, w] = useState(void 0), [v, D] = useState(false), N = useId();
  useEffect(() => {
    return;
  }, [n, v]);
  const $ = useCallback((x) => {
    if (l(x), "undefined" < "u") ;
  }, []), A = (x) => `${N}-domain-tab-${x}`, g = (x) => `${N}-domain-panel-${x}`, f = (x) => {
    requestAnimationFrame(() => {
      var _a;
      (_a = document.getElementById(A(x))) == null ? void 0 : _a.focus();
    });
  }, k = (x, I) => {
    if (x.key === "ArrowRight") {
      x.preventDefault();
      const M = F[(I + 1) % F.length];
      $(M.id), f(M.id);
      return;
    }
    if (x.key === "ArrowLeft") {
      x.preventDefault();
      const M = F[(I - 1 + F.length) % F.length];
      $(M.id), f(M.id);
      return;
    }
    if (x.key === "Home") {
      x.preventDefault(), $(F[0].id), f(F[0].id);
      return;
    }
    x.key === "End" && (x.preventDefault(), $(F[F.length - 1].id), f(F[F.length - 1].id));
  };
  return jsxs("div", { "data-loaded": v || void 0, children: [jsxs("div", { className: "mb-6", children: [jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [jsx("h1", { className: "text-3xl font-bold text-gray-900 break-all", children: n }), jsx("button", { type: "button", onClick: async () => {
    d(true), p(null);
    try {
      const x = await fetch("/api/collect/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: n, zoneManagement: "unmanaged" }) });
      if (!x.ok) {
        const I = await x.json().catch(() => ({ error: "Refresh failed" }));
        if (x.status === 401 || x.status === 403) {
          p("Operator sign-in is required to refresh DNS evidence.");
          return;
        }
        p(I.message || I.error || "Refresh failed");
        return;
      }
      D(false);
    } finally {
      d(false);
    }
  }, disabled: u, "aria-busy": u, className: "focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400", children: u ? "Refreshing..." : "Refresh" })] }), c ? jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [jsx(at, { type: c.zoneManagement }), jsx(nt, { state: c.resultState }), jsxs("span", { className: "text-sm text-gray-500 tabular-nums", children: ["Last updated: ", new Date(c.createdAt).toLocaleString()] })] }) : C ? jsx("div", { className: `mt-4 p-4 rounded-lg border ${C.type === "api_unreachable" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`, "data-testid": "loader-error-banner", children: jsx("p", { className: C.type === "api_unreachable" ? "text-red-800" : "text-orange-800", children: C.message }) }) : jsx("div", { className: "mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg", "data-testid": "domain-no-data-banner", children: jsxs("p", { className: "text-yellow-800", children: ["No DNS snapshot is available for ", n, " yet. Use an operator session to refresh and collect new DNS evidence."] }) }), s ? jsx("div", { className: "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700", "data-testid": "domain-refresh-error-banner", role: "alert", children: s }) : null] }), jsx("div", { className: "border-b border-gray-200 mb-6 overflow-x-auto", children: jsx("div", { role: "tablist", "aria-label": "Domain DNS views", className: "-mb-px flex w-max min-w-full space-x-4 sm:space-x-8", children: F.map((x, I) => jsx("button", { type: "button", id: A(x.id), role: "tab", "aria-selected": i === x.id, "aria-controls": g(x.id), tabIndex: i === x.id ? 0 : -1, onClick: () => $(x.id), onKeyDown: (M) => k(M, I), className: `focus-ring min-h-10 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${i === x.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`, children: x.label }, x.id)) }) }), jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6", children: [jsx("div", { role: "tabpanel", id: g("overview"), "aria-labelledby": A("overview"), hidden: i !== "overview", "data-testid": "domain-tabpanel-overview", children: i === "overview" && jsx(it, { domain: n, snapshot: c, observations: y }) }), jsx("div", { role: "tabpanel", id: g("dns"), "aria-labelledby": A("dns"), hidden: i !== "dns", "data-testid": "domain-tabpanel-dns", children: i === "dns" && jsx(lt, { observations: y }) }), jsx("div", { role: "tabpanel", id: g("mail"), "aria-labelledby": A("mail"), hidden: i !== "mail", "data-testid": "domain-tabpanel-mail", children: i === "mail" && jsx(ot, { domain: n, snapshotId: c == null ? void 0 : c.id }) }), jsx("div", { role: "tabpanel", id: g("history"), "aria-labelledby": A("history"), hidden: i !== "history", "data-testid": "domain-tabpanel-history", children: i === "history" && jsx(dt, { domain: n }) }), de && jsx("div", { role: "tabpanel", id: g("delegation"), "aria-labelledby": A("delegation"), hidden: i !== "delegation", "data-testid": "domain-tabpanel-delegation", children: i === "delegation" && jsx(ct, { domain: n, snapshotId: c == null ? void 0 : c.id }) })] })] });
};

export { Ct as component };
//# sourceMappingURL=_domain-DRJ5bw6B.mjs.map
