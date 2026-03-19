import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { DomainInput } from '../components/DomainInput.js';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();

  const handleDomainSubmit = (domain: string) => {
    navigate({ to: '/domain/$domain', params: { domain } });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">DNS Ops Workbench</h1>
        <p className="text-lg text-gray-600">
          Analyze DNS configurations and diagnose mail delivery issues
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="block text-sm font-medium text-gray-700 mb-2">Enter a domain to analyze</p>
        <DomainInput onSubmit={handleDomainSubmit} />

        <div className="mt-4 text-sm text-gray-500">
          <p>Examples: example.com, google.com, your-domain.com</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          title="DNS Analysis"
          description="Check A, AAAA, MX, TXT, NS, SOA, and CAA records from multiple vantage points"
        />
        <FeatureCard
          title="Mail Diagnostics"
          description="Validate SPF, DMARC, and DKIM configurations"
        />
        <FeatureCard
          title="Historical Tracking"
          description="Compare snapshots over time to track changes"
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
