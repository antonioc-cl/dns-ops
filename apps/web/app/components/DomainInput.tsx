import { type FormEvent, useMemo, useState } from 'react';
import { normalizeDomain } from '../lib/domain.js';

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
      const result = normalizeDomain(input);
      return result.normalized;
    } catch {
      return '';
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = normalizeDomain(input);
      onSubmit(result.normalized);
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Invalid domain name');
      }
    }
  };

  return (
    <form action="/" method="get" onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            name="domain"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="example.com"
            className="focus-ring flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg"
            aria-label="Domain name"
          />
          <button
            type="submit"
            className="focus-ring px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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
