import { defineConfig } from '@tanstack/react-start/config';

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
    // pg's optional native binding is unavailable in CF Workers — stub it so
    // the bundle doesn't fail. The production app still uses PostgreSQL, but
    // Workers receive the connection string from runtime bindings/env instead of
    // loading native pg bindings in the browser bundle.
    rollupConfig: {
      plugins: [
        {
          name: 'stub-pg-native',
          resolveId(id: string) {
            if (id === 'pg-native') return '\0pg-native-stub';
          },
          load(id: string) {
            if (id === '\0pg-native-stub') return 'export default null;';
          },
        },
      ],
    },
  },
  tsr: {
    appDirectory: 'app',
    routesDirectory: 'app/routes',
    generatedRouteTree: 'app/routeTree.gen.ts',
  },
});
