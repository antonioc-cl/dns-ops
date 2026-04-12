import { defineConfig } from '@tanstack/react-start/config';

// Railway-optimized config: uses node-server preset (Vinxi default)
// This overrides the cloudflare-pages preset from app.config.ts

export default defineConfig({
  server: {
    preset: 'node-server',
    // Stub pg-native like the CF config does
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
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Disable CSS filename hashing for predictable asset URLs
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/[name].[ext]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  },
  tsr: {
    appDirectory: 'app',
    routesDirectory: 'app/routes',
    generatedRouteTree: 'app/routeTree.gen.ts',
  },
});
