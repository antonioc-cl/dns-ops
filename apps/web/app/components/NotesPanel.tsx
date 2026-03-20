/**
 * Notes Panel - dns-ops-1j4.10.3
 *
 * Domain notes management UI component.
 * Allows creating, editing, and deleting notes for a domain.
 */

import { useCallback, useEffect, useState } from 'react';

interface Note {
  id: string;
  domainId: string;
  content: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotesPanelProps {
  /** Domain UUID (preferred) or domain name */
  domainId: string;
  /** If true, assumes domainId is a domain name and looks up the ID first */
  isDomainName?: boolean;
}

export function NotesPanel({ domainId, isDomainName = false }: NotesPanelProps) {
  const [resolvedDomainId, setResolvedDomainId] = useState<string | null>(
    isDomainName ? null : domainId
  );

  // If using domain name, resolve to ID first
  useEffect(() => {
    if (!isDomainName) {
      setResolvedDomainId(domainId);
      return;
    }

    async function resolveDomainId() {
      try {
        const response = await fetch(`/api/domain/${domainId}/latest`);
        if (response.ok) {
          const data = await response.json();
          if (data.domainId) {
            setResolvedDomainId(data.domainId);
          }
        }
      } catch {
        // Will show error in notes fetch
      }
    }
    resolveDomainId();
  }, [domainId, isDomainName]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!resolvedDomainId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/domains/${resolvedDomainId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [resolvedDomainId]);

  useEffect(() => {
    if (resolvedDomainId) {
      fetchNotes();
    }
  }, [resolvedDomainId, fetchNotes]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim() || !resolvedDomainId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/portfolio/domains/${resolvedDomainId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      setNewNoteContent('');
      setIsCreating(false);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/portfolio/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      setEditingId(null);
      setEditContent('');
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/portfolio/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Notes</h3>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Note
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create new note */}
        {isCreating && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteContent('');
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || isSaving}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No notes yet.{' '}
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                Add one
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {editingId === note.id ? (
                  // Editing mode
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={!editContent.trim() || isSaving}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div>
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="text-gray-500">
                        {note.author && <span className="mr-2">{note.author}</span>}
                        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(note)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
