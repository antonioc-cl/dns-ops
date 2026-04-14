import { jsx, jsxs } from 'react/jsx-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

const y = function() {
  const c = useNavigate(), [r, d] = useState(""), [o, a] = useState(""), [m, s] = useState(false);
  return jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: jsx("div", { className: "max-w-md w-full", children: jsxs("div", { className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10", children: [jsxs("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: [jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-gray-900", children: "Sign in to DNS Ops" }), jsx("p", { className: "mt-2 text-center text-sm text-gray-600", children: "Internal access only" })] }), jsxs("form", { className: "mt-8 space-y-6", onSubmit: async (l) => {
    if (l.preventDefault(), a(""), s(true), !r) {
      a("Email is required"), s(false);
      return;
    }
    try {
      const n = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: r }), credentials: "include" });
      if (n.ok) c({ to: "/portfolio" });
      else {
        const u = await n.json();
        a(u.error || "Login failed");
      }
    } catch {
      a("Network error. Please try again.");
    } finally {
      s(false);
    }
  }, children: [jsxs("div", { children: [jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "Email address" }), jsx("div", { className: "mt-1", children: jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: r, onChange: (l) => d(l.target.value), className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "admin@yourcompany.com" }) })] }), o && jsx("div", { className: "text-sm text-red-600", children: o }), jsx("div", { children: jsx("button", { type: "submit", disabled: m, className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400", children: m ? "Signing in..." : "Sign in" }) })] }), jsx("div", { className: "mt-6", children: jsxs("div", { className: "relative", children: [jsx("div", { className: "absolute inset-0 flex items-center", children: jsx("div", { className: "w-full border-t border-gray-300" }) }), jsx("div", { className: "relative flex justify-center text-sm", children: jsx("span", { className: "px-2 bg-white text-gray-500", children: "Internal use only" }) })] }) })] }) }) });
};

export { y as component };
//# sourceMappingURL=login-BpEEdc2c.mjs.map
