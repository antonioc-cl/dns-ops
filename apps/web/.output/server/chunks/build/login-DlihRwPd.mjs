import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

const j = function() {
  const f = useNavigate(), [a, d] = useState(false), [i, b] = useState(""), [o, g] = useState(""), [c, x] = useState(""), [m, r] = useState(""), [u, l] = useState(false);
  return jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: jsx("div", { className: "max-w-md w-full", children: jsxs("div", { className: "bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10", children: [jsxs("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: [jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-gray-900", children: a ? "Create Account" : "Sign in to DNS Ops" }), jsx("p", { className: "mt-2 text-center text-sm text-gray-600", children: a ? jsxs(Fragment, { children: ["Already have an account?", " ", jsx("button", { type: "button", onClick: () => {
    d(false), r("");
  }, className: "font-medium text-blue-600 hover:text-blue-500", children: "Sign in" })] }) : jsxs(Fragment, { children: ["Need an account?", " ", jsx("button", { type: "button", onClick: () => {
    d(true), r("");
  }, className: "font-medium text-blue-600 hover:text-blue-500", children: "Sign up" })] }) })] }), jsxs("form", { className: "mt-8 space-y-6", onSubmit: async (s) => {
    if (s.preventDefault(), r(""), l(true), !i || !o) {
      r("Email and password are required"), l(false);
      return;
    }
    if (a && o !== c) {
      r("Passwords do not match"), l(false);
      return;
    }
    if (a && o.length < 8) {
      r("Password must be at least 8 characters"), l(false);
      return;
    }
    try {
      const p = await fetch(a ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: i, password: o }) }), w = await p.json();
      p.ok ? f({ to: "/portfolio" }) : r(w.error || (a ? "Signup failed" : "Login failed"));
    } catch {
      r("Network error. Please try again.");
    } finally {
      l(false);
    }
  }, children: [jsxs("div", { children: [jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "Email address" }), jsx("div", { className: "mt-1", children: jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: i, onChange: (s) => b(s.target.value), className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "you@yourcompany.com" }) })] }), jsxs("div", { children: [jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700", children: "Password" }), jsx("div", { className: "mt-1", children: jsx("input", { id: "password", name: "password", type: "password", autoComplete: a ? "new-password" : "current-password", required: true, minLength: 8, value: o, onChange: (s) => g(s.target.value), className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: a ? "At least 8 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }) })] }), a && jsxs("div", { children: [jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-gray-700", children: "Confirm Password" }), jsx("div", { className: "mt-1", children: jsx("input", { id: "confirmPassword", name: "confirmPassword", type: "password", autoComplete: "new-password", required: true, minLength: 8, value: c, onChange: (s) => x(s.target.value), className: "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }) })] }), m && jsx("div", { className: "text-sm text-red-600", children: m }), jsx("div", { children: jsx("button", { type: "submit", disabled: u, className: "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400", children: u ? "Please wait..." : a ? "Create Account" : "Sign in" }) })] }), jsx("div", { className: "mt-6", children: jsxs("div", { className: "relative", children: [jsx("div", { className: "absolute inset-0 flex items-center", children: jsx("div", { className: "w-full border-t border-gray-300" }) }), jsx("div", { className: "relative flex justify-center text-sm", children: jsx("span", { className: "px-2 bg-white text-gray-500", children: "DNS Ops Workbench" }) })] }) })] }) }) });
};

export { j as component };
//# sourceMappingURL=login-DlihRwPd.mjs.map
