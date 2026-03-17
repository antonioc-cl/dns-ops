import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
  },
  tsr: {
    appDirectory: 'app',
    routesDirectory: 'app/routes',
    generatedRouteTree: 'app/routeTree.gen.ts',
  },
})
