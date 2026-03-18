import { useState } from 'react';
import { ISSUE_LABELS, type IssueType } from './types';

interface RemediationFormProps {
  domain: string;
  snapshotId?: string;
  issues: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormErrors {
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  issues?: string;
  general?: string;
}

export function RemediationForm({ domain, snapshotId, issues, onClose, onSuccess }: RemediationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    contactEmail: '',
    contactName: '',
    contactPhone: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: '',
    selectedIssues: issues as string[],
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional
    const phoneRegex = /^\+?[\d\s-]{8,20}$/;
    return phoneRegex.test(phone);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.contactEmail || !validateEmail(formData.contactEmail)) {
      newErrors.contactEmail = 'Valid email address required';
    }

    if (!formData.contactName || formData.contactName.length < 2) {
      newErrors.contactName = 'Name must be at least 2 characters';
    }

    if (formData.contactPhone && !validatePhone(formData.contactPhone)) {
      newErrors.contactPhone = 'Valid phone number required (8-20 digits, optional + prefix)';
    }

    if (formData.selectedIssues.length === 0) {
      newErrors.issues = 'Select at least one issue to fix';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          snapshotId,
          contactEmail: formData.contactEmail,
          contactName: formData.contactName,
          contactPhone: formData.contactPhone || undefined,
          priority: formData.priority,
          issues: formData.selectedIssues,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to submit request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleIssue = (issue: string) => {
    setFormData(prev => ({
      ...prev,
      selectedIssues: prev.selectedIssues.includes(issue)
        ? prev.selectedIssues.filter(i => i !== issue)
        : [...prev.selectedIssues, issue],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border space-y-4">
      <h4 className="font-semibold text-lg">Request Remediation</h4>
      <p className="text-sm text-gray-600">
        Submit a request to fix mail configuration issues for <strong>{domain}</strong>
      </p>

      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contact Email *
        </label>
        <input
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="admin@example.com"
        />
        {errors.contactEmail && (
          <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
        )}
      </div>

      {/* Contact Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contact Name *
        </label>
        <input
          type="text"
          value={formData.contactName}
          onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="John Doe"
        />
        {errors.contactName && (
          <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Phone (optional)
        </label>
        <input
          type="tel"
          value={formData.contactPhone}
          onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="+1 555-123-4567"
        />
        {errors.contactPhone && (
          <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
        )}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as typeof formData.priority }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Issues */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Issues to Fix *
        </label>
        <div className="mt-2 space-y-2">
          {issues.map((issue) => (
            <label key={issue} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.selectedIssues.includes(issue)}
                onChange={() => toggleIssue(issue)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {ISSUE_LABELS[issue as IssueType] || issue}
              </span>
            </label>
          ))}
        </div>
        {errors.issues && (
          <p className="mt-1 text-sm text-red-600">{errors.issues}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Any additional context..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
