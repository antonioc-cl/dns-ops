import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link to="/" className="focus-ring text-xl font-bold text-gray-900 rounded">
                  DNS Ops Workbench
                </Link>
                <nav className="flex gap-6">
                  <Link
                    to="/"
                    className="focus-ring rounded text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 [&.active]:font-medium"
                  >
                    Home
                  </Link>
                  <Link
                    to="/portfolio"
                    className="focus-ring rounded text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 [&.active]:font-medium"
                  >
                    Portfolio
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
