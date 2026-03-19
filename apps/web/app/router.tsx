import type { AnyRouter } from '@tanstack/react-router';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

export function createRouter(): AnyRouter {
  return createTanStackRouter({
    routeTree,
    context: {},
    defaultPreload: 'intent',
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
