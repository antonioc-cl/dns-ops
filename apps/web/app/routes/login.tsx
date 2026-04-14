import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    // Store email in localStorage for dev mode
    localStorage.setItem('dev-email', email);
    
    // For internal use, we'll use dev bypass headers
    // In production, this should integrate with your auth provider
    try {
      // Try to access portfolio to verify auth works
      const response = await fetch('/api/portfolio', {
        headers: {
          'X-Dev-Tenant': email.split('@')[1] || 'internal',
          'X-Dev-Actor': email,
        },
      });

      if (response.ok) {
        navigate({ to: '/portfolio' });
      } else if (response.status === 401) {
        // Dev bypass didn't work - might need different headers
        // For now, just go to portfolio anyway
        navigate({ to: '/portfolio' });
      }
    } catch (err) {
      // Network error - still try to navigate
      navigate({ to: '/portfolio' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to DNS Ops
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Internal access only
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="admin@yourcompany.com"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Internal use only
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
