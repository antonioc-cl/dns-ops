/**
 * Legacy Tools Panel
 *
 * Provides access to existing DMARC/DKIM tools from within the Domain 360 view.
 * These tools remain authoritative until the new rules engine achieves parity
 * (tracked via shadow comparison in Bead 09).
 */

import { useState, useEffect } from 'react';
import {
  defaultLegacyToolsConfig,
  buildDmarcLink,
  buildDkimLink,
  logLegacyToolAccess,
  type LegacyToolsConfig,
} from '../config/legacy-tools';

interface LegacyToolsPanelProps {
  domain: string;
  detectedSelectors?: string[];
}

export function LegacyToolsPanel({ domain, detectedSelectors = [] }: LegacyToolsPanelProps) {
  const [config, setConfig] = useState<LegacyToolsConfig>(defaultLegacyToolsConfig);
  const [activeTool, setActiveTool] = useState<'dmarc' | 'dkim' | null>(null);

  // Load configuration (could be fetched from API in production)
  useEffect(() => {
    // In production, this might fetch from /api/config/legacy-tools
    setConfig(defaultLegacyToolsConfig);
  }, []);

  const handleDmarcClick = () => {
    logLegacyToolAccess('dmarc', domain, 'navigate');
    setActiveTool('dmarc');
  };

  const handleDkimClick = (selector?: string) => {
    logLegacyToolAccess('dkim', domain, 'navigate', { selector });
    setActiveTool('dkim');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-amber-900">Legacy Mail Tools</h4>
            <p className="text-sm text-amber-800 mt-1">
              These external DMARC/DKIM tools remain authoritative. New workbench findings
              are in shadow mode until parity is proven (Bead 09).
            </p>
          </div>
        </div>
      </div>

      {/* DMARC Tool Card */}
      <ToolCard
        title={config.dmarc.name}
        description={config.dmarc.description}
        icon="dmarc"
        onView={() => handleDmarcClick()}
        externalUrl={buildDmarcLink(config.dmarc, domain)}
        requiresAuth={config.dmarc.authRequired}
      />

      {/* DKIM Tool Card */}
      <ToolCard
        title={config.dkim.name}
        description={config.dkim.description}
        icon="dkim"
        onView={() => handleDkimClick()}
        externalUrl={buildDkimLink(config.dkim, domain)}
        requiresAuth={config.dkim.authRequired}
      />

      {/* Detected Selectors */}
      {detectedSelectors.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Detected DKIM Selectors</h4>
          <div className="space-y-2">
            {detectedSelectors.map((selector) => (
              <div
                key={selector}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <code className="text-sm font-mono">{selector}</code>
                <a
                  href={buildDkimLink(config.dkim, domain, selector)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleDkimClick(selector)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Validate in legacy tool →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tool Preview / Deep Link */}
      {activeTool && (
        <DeepLinkModal
          tool={activeTool}
          domain={domain}
          config={activeTool === 'dmarc' ? config.dmarc : config.dkim}
          onClose={() => setActiveTool(null)}
        />
      )}
    </div>
  );
}

interface ToolCardProps {
  title: string;
  description: string;
  icon: 'dmarc' | 'dkim';
  onView: () => void;
  externalUrl: string;
  requiresAuth: boolean;
}

function ToolCard({ title, description, icon, onView, externalUrl, requiresAuth }: ToolCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          {icon === 'dmarc' ? (
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {requiresAuth && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Requires Auth
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onView}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Open Tool
            </button>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Open in new tab →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeepLinkModalProps {
  tool: 'dmarc' | 'dkim';
  domain: string;
  config: { name: string; baseUrl: string };
  onClose: () => void;
}

function DeepLinkModal({ tool, domain, config, onClose }: DeepLinkModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Open {config.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You are about to navigate to the legacy {tool.toUpperCase()} tool for{' '}
          <strong>{domain}</strong>. Domain context will be pre-filled.
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destination</div>
          <div className="text-sm font-mono text-gray-700 truncate">{config.baseUrl}</div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={tool === 'dmarc' ? buildDmarcLink(config, domain) : buildDkimLink(config, domain)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700"
          >
            Continue to Tool
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
