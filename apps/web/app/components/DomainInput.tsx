import { useState, useMemo } from 'react';
import { normalizeDomain, DomainValidationError } from '../lib/domain';

interface DomainInputProps {
  onSubmit: (domain: string) => void;
  initialValue?: string;
}

export function DomainInput({ onSubmit, initialValue = '' }: DomainInputProps) {
  const [input, setInput] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const normalizedDomain = useMemo(() => {
    if (!input.trim()) return '';
    try {
      return normalizeDomain(input);
    } catch {
      return '';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const domain = normalizeDomain(input);
      onSubmit(domain);
    } catch (err) {
      if (err instanceof DomainValidationError) {
        setError(err.message);
      } else {
        setError('Invalid domain name');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Domain name"
          />
          <button
            type="submit"
            disabled={!normalizedDomain}
            className="px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Analyze
          </button>
        </div>
        
        {normalizedDomain && normalizedDomain !== input.trim().toLowerCase() && (
          <p className="text-sm text-gray-600">
            Will query: <code className="px-1 py-0.5 bg-gray-100 rounded">{normalizedDomain}</code>
          </p>
        )}
        
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
