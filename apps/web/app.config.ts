import { defineConfig } from '@tanstack/react-start/config';

export default defineConfig({
  server: {
    preset: 'node-server',
    // pg's optional native binding is unavailable in bundled output — stub it
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
          // This allows hardcoding the CSS path in __root.tsx
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
