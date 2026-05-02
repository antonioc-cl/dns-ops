import type { AnyRouter } from '@tanstack/react-router';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

function DefaultNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">The page you requested does not exist.</p>
      </div>
    </div>
  );
}

export function createRouter(): AnyRouter {
  return createTanStackRouter({
    routeTree,
    context: {},
    defaultPreload: 'intent',
    defaultNotFoundComponent: DefaultNotFound,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
