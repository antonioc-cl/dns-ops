import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';
import { createRouter as createTanStackRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

const queryClient = new QueryClient();

const router: AnyRouter = createTanStackRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
