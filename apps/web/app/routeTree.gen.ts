/* eslint-disable */
// @ts-nocheck

// Manually maintained route tree until codegen is wired.

import { Route as rootRoute } from './routes/__root.js'
import { Route as IndexImport } from './routes/index.js'
import { Route as DomainImport } from './routes/domain/$domain.js'

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const DomainRoute = DomainImport.update({
  id: '/domain/$domain',
  path: '/domain/$domain',
  getParentRoute: () => rootRoute,
} as any)

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/domain/$domain': {
      id: '/domain/$domain'
      path: '/domain/$domain'
      fullPath: '/domain/$domain'
      preLoaderRoute: typeof DomainImport
      parentRoute: typeof rootRoute
    }
  }
}

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/domain/$domain': typeof DomainRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/domain/$domain': typeof DomainRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/domain/$domain': typeof DomainRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/domain/$domain'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/domain/$domain'
  id: '__root__' | '/' | '/domain/$domain'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  DomainRoute: typeof DomainRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  DomainRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
