import React, { useState, useContext } from 'react';
import AppContext from '../contexts/AppContext';
import type { Note } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

const NotesPage: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useContext(AppContext)!;
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditNote = (_note: Note) => {
    setEditingNoteId(_note.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Engineering Notes</h1>
          <p className="text-xs text-[#8a8f98] mt-1">Structured notes, architectural patterns, and algorithmic insights</p>
        </div>
        <button
          onClick={() => {
            setEditingNoteId(null);
            setShowForm(true);
          }}
          className="linear-btn-primary px-4 py-2 text-xs font-semibold"
        >
          + New Note
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search notes by title, content, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="linear-input w-full py-2 pl-9 pr-3 text-xs"
        />
        <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="linear-card group p-5 flex flex-col justify-between cursor-pointer select-none"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5e6ad2]">
                    {note.category || 'General'}
                  </span>
                  <span className="text-[10px] text-[#62666f] font-mono">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-[#5e6ad2] transition-colors leading-snug">
                  {note.title}
                </h3>

                <p className="text-xs text-[#8a8f98] line-clamp-3 leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-white/[0.05] flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="linear-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditNote(note);
                  }}
                  className="text-xs text-[#8a8f98] hover:text-white"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
          <p>No notes found matching your criteria.</p>
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5e6ad2] block mb-1">
                  {selectedNote.category || 'General'}
                </span>
                <h2 className="text-xl font-bold text-white">{selectedNote.title}</h2>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-[#090a0f] p-4 border border-white/[0.06] text-[#f7f8f8] leading-relaxed text-sm whitespace-pre-wrap">
              {selectedNote.content}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {selectedNote.tags.map(tag => (
                <span key={tag} className="linear-tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setNoteToDelete(selectedNote)}
                className="text-xs text-[#f43f5e] hover:underline"
              >
                Delete Note
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedNote;
                    setSelectedNote(null);
                    handleEditNote(toEdit);
                  }}
                  className="linear-btn-primary px-4 py-1.5 text-xs"
                >
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {noteToDelete && (
        <ConfirmDialog
          title="Delete note?"
          message={`This will permanently delete “${noteToDelete.title}”.`}
          onCancel={() => setNoteToDelete(null)}
          onConfirm={() => {
            deleteNote(noteToDelete.id);
            setNoteToDelete(null);
            setSelectedNote(null);
          }}
        />
      )}

      {/* Add/Edit Note Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">
                {editingNoteId ? 'Edit Note' : 'Create Engineering Note'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const noteData = {
                  title: (form.elements.namedItem('title') as HTMLInputElement).value,
                  content: (form.elements.namedItem('content') as HTMLTextAreaElement).value,
                  tags: ((form.elements.namedItem('tags') as HTMLInputElement).value)
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0),
                  category: (form.elements.namedItem('category') as HTMLInputElement).value,
                  createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

                if (editingNoteId) {
                  updateNote(editingNoteId, noteData);
                } else {
                  addNote(noteData);
                }
                setShowForm(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingNoteId ? notes.find(n => n.id === editingNoteId)?.title || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  defaultValue={editingNoteId ? notes.find(n => n.id === editingNoteId)?.category || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  placeholder="e.g., Frontend, System Design, Algorithms"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Content</label>
                <textarea
                  name="content"
                  defaultValue={editingNoteId ? notes.find(n => n.id === editingNoteId)?.content || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs h-36 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={editingNoteId ? notes.find(n => n.id === editingNoteId)?.tags.join(', ') || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  placeholder="React, Memoization, State"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-white/[0.1] px-4 py-2 text-xs text-[#8a8f98] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="linear-btn-primary px-4 py-2 text-xs font-semibold"
                >
                  {editingNoteId ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;