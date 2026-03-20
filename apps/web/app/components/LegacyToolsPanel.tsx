/**
 * Legacy Tools Panel
 *
 * Provides access to existing DMARC/DKIM tools from within the Domain 360 view.
 * These tools remain authoritative until the new rules engine achieves parity
 * (tracked via shadow comparison in Bead 09).
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  buildDkimLink,
  buildDmarcLink,
  defaultLegacyToolsConfig,
  type LegacyToolConfig,
  type LegacyToolsConfig,
  logLegacyToolAccess,
} from '../config/legacy-tools.js';

interface LegacyToolsPanelProps {
  domain: string;
  detectedSelectors?: string[];
}

export function LegacyToolsPanel({ domain, detectedSelectors = [] }: LegacyToolsPanelProps) {
  const [config, setConfig] = useState<LegacyToolsConfig>(defaultLegacyToolsConfig);
  const [activeTool, setActiveTool] = useState<'dmarc' | 'dkim' | null>(null);

  useEffect(() => {
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
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-amber-900">Legacy Mail Tools</h4>
            <p className="text-sm text-amber-800 mt-1">
              These external DMARC/DKIM tools remain authoritative. New workbench findings are in
              shadow mode until parity is proven (Bead 09).
            </p>
          </div>
        </div>
      </div>

      <ToolCard
        title={config.dmarc.name}
        description={config.dmarc.description}
        icon="dmarc"
        onView={handleDmarcClick}
        externalUrl={buildDmarcLink(config.dmarc, domain)}
        requiresAuth={config.dmarc.authRequired}
        available={config.dmarc.available}
      />

      <ToolCard
        title={config.dkim.name}
        description={config.dkim.description}
        icon="dkim"
        onView={() => handleDkimClick()}
        externalUrl={buildDkimLink(config.dkim, domain)}
        requiresAuth={config.dkim.authRequired}
        available={config.dkim.available}
      />

      {detectedSelectors.length > 0 && config.dkim.available && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Detected DKIM Selectors</h4>
          <div className="space-y-2">
            {detectedSelectors.map((selector) => {
              const selectorLink = buildDkimLink(config.dkim, domain, selector);
              return (
                <div
                  key={selector}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <code className="text-sm font-mono">{selector}</code>
                  {selectorLink && (
                    <a
                      href={selectorLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleDkimClick(selector)}
                      className="focus-ring text-sm text-blue-600 hover:text-blue-800"
                    >
                      Validate in legacy tool →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
  externalUrl: string | null;
  requiresAuth: boolean;
  available: boolean;
}

function ToolCard({
  title,
  description,
  icon,
  onView,
  externalUrl,
  requiresAuth,
  available,
}: ToolCardProps) {
  if (!available) {
    return (
      <div className="border rounded-lg p-4 opacity-60">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            {icon === 'dmarc' ? (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-500">{title}</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                Not Configured
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
            <p className="text-xs text-gray-400 mt-2">
              This tool is not available in the current environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-150 motion-reduce:transition-none">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          {icon === 'dmarc' ? (
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
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
              type="button"
              onClick={onView}
              className="focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Open Tool
            </button>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-sm text-gray-500 hover:text-gray-700"
              >
                Open in new tab →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeepLinkModalProps {
  tool: 'dmarc' | 'dkim';
  domain: string;
  config: LegacyToolConfig;
  onClose: () => void;
}

function DeepLinkModal({ tool, domain, config, onClose }: DeepLinkModalProps) {
  const continueRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalTitleId = useId();
  const modalDescriptionId = useId();

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    continueRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      const focusables = Array.from(focusableElements);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose]);

  const destinationUrl =
    tool === 'dmarc' ? buildDmarcLink(config, domain) : buildDkimLink(config, domain);

  // Don't render modal if tool is not available
  if (!config.available || !destinationUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close legacy tool dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        aria-describedby={modalDescriptionId}
        className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id={modalTitleId} className="text-lg font-semibold text-gray-900">
            Open {config.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring min-h-10 min-w-10 rounded text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p id={modalDescriptionId} className="text-sm text-gray-600 mb-4">
          You are about to navigate to the legacy {tool.toUpperCase()} tool for{' '}
          <strong>{domain}</strong>. Domain context will be pre-filled.
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destination</div>
          <div className="text-sm font-mono text-gray-700 truncate">{config.baseUrl}</div>
        </div>

        <div className="flex items-center gap-3">
          <a
            ref={continueRef}
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="focus-ring flex-1 min-h-10 px-4 py-2 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700"
          >
            Continue to Tool
          </a>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring min-h-10 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
