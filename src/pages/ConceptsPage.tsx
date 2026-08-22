import React, { useState, useContext } from 'react';
import AppContext from '../contexts/AppContext';
import type { Concept } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

const CONCEPT_NOTE_TEMPLATE = `What is it?

How it works:

When to use it:

Example:

Time complexity:

Space complexity:

Key takeaways:
`;

const ConceptsPage: React.FC = () => {
  const { concepts, addConcept, updateConcept, deleteConcept, problems, notes } = useContext(AppContext)!;
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [conceptToDelete, setConceptToDelete] = useState<Concept | null>(null);

  const getRelatedProblems = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return [];
    return problems.filter(problem => concept.relatedProblems?.includes(problem.id));
  };

  const getRelatedNotes = (conceptId: string) => {
    const concept = concepts.find(c => c.id === conceptId);
    if (!concept) return [];
    return notes.filter(note => concept.relatedNotes?.includes(note.id));
  };

  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concept.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditConcept = (concept: Concept) => {
    setEditingConceptId(concept.id);
    setShowForm(true);
  };

  const selectedConcept = concepts.find(concept => concept.id === selectedConceptId);

  const handleSaveConceptDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConcept) return;

    const form = new FormData(event.currentTarget);
    updateConcept(selectedConcept.id, {
      notes: String(form.get('notes') || ''),
    });
    setSelectedConceptId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Programming Concepts</h1>
          <p className="text-xs text-[#8a8f98] mt-1">Core paradigms, data structures, and mental models</p>
        </div>
        <button
          onClick={() => {
            setEditingConceptId(null);
            setShowForm(true);
          }}
          className="linear-btn-primary px-4 py-2 text-xs font-semibold"
        >
          + New Concept
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search concepts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="linear-input w-full py-2 pl-9 pr-3 text-xs"
        />
        <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {/* Concepts Grid */}
      {filteredConcepts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConcepts.map(concept => {
            const relProblems = getRelatedProblems(concept.id);
            const relNotes = getRelatedNotes(concept.id);

            return (
              <div
                key={concept.id}
                onClick={() => setSelectedConceptId(concept.id)}
                className="linear-card group p-5 flex flex-col justify-between cursor-pointer select-none"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c084fc]">
                      Concept
                    </span>
                    {concept.timeComplexity && (
                      <span className="font-mono text-[10px] text-[#8a8f98] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {concept.timeComplexity}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-[#c084fc] transition-colors leading-snug">
                    {concept.name}
                  </h3>

                  <p className="text-xs text-[#8a8f98] line-clamp-3 leading-relaxed">
                    {concept.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-[#62666f]">
                    <span>{relProblems.length} problems</span>
                    <span>•</span>
                    <span>{relNotes.length} notes</span>
                  </div>

                  <span className="text-[11px] text-[#c084fc] font-medium group-hover:underline">
                    View Notes →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
          <p>No concepts found matching your search.</p>
        </div>
      )}

      {/* Concept Note Editor / Viewer Modal */}
      {selectedConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="my-4 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0d12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0e1015] px-5 py-3">
              <div>
                <h2 className="font-mono text-xs font-semibold text-white">{selectedConcept.name}.md</h2>
                <p className="text-[10px] text-[#8a8f98]">Structured concept documentation and complexities</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConceptId(null)}
                className="text-[#8a8f98] hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConceptDetails} className="flex min-h-0 flex-1 flex-col">
              <textarea
                id="concept-notes"
                name="notes"
                defaultValue={selectedConcept.notes || CONCEPT_NOTE_TEMPLATE}
                spellCheck
                className="min-h-0 flex-1 resize-none border-0 bg-[#08090a] p-6 font-mono text-xs leading-relaxed text-[#dedede] outline-none placeholder:text-[#62666f]"
                aria-label={`${selectedConcept.name} notes`}
              />

              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0e1015] px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = selectedConcept;
                      setSelectedConceptId(null);
                      handleEditConcept(toEdit);
                    }}
                    className="rounded-md border border-white/[0.1] px-3.5 py-1.5 text-xs text-[#8a8f98] hover:text-white"
                  >
                    Edit metadata
                  </button>
                  <button
                    type="button"
                    onClick={() => setConceptToDelete(selectedConcept)}
                    className="rounded-md border border-[#f43f5e]/30 px-3.5 py-1.5 text-xs text-[#f43f5e] hover:bg-[#f43f5e]/10"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConceptId(null)}
                    className="rounded-md border border-white/[0.1] px-3.5 py-1.5 text-xs text-[#8a8f98] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="linear-btn-primary px-4 py-1.5 text-xs font-semibold">
                    Save Notes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {conceptToDelete && (
        <ConfirmDialog
          title="Delete concept?"
          message={`This will permanently delete “${conceptToDelete.name}”.`}
          onCancel={() => setConceptToDelete(null)}
          onConfirm={() => {
            deleteConcept(conceptToDelete.id);
            setConceptToDelete(null);
            setSelectedConceptId(null);
          }}
        />
      )}

      {/* Add / Edit Concept Info Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">
                {editingConceptId ? 'Edit Concept' : 'Add New Concept'}
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
                const relatedNotesField = form.elements.namedItem('relatedNotes') as HTMLInputElement | null;
                const existingConcept = editingConceptId
                  ? concepts.find(concept => concept.id === editingConceptId)
                  : undefined;
                const conceptData = {
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
                  timeComplexity: (form.elements.namedItem('timeComplexity') as HTMLInputElement).value,
                  spaceComplexity: (form.elements.namedItem('spaceComplexity') as HTMLInputElement).value,
                  relatedProblems: ((form.elements.namedItem('relatedProblems') as HTMLInputElement).value)
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id.length > 0),
                  relatedNotes: relatedNotesField
                    ? relatedNotesField.value.split(',').map(id => id.trim()).filter(id => id.length > 0)
                    : existingConcept?.relatedNotes || [],
                };

                if (editingConceptId) {
                  updateConcept(editingConceptId, conceptData);
                } else {
                  addConcept(conceptData);
                }
                setShowForm(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Concept Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.name || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Overview Description</label>
                <textarea
                  name="description"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.description || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Time Complexity</label>
                  <input
                    type="text"
                    name="timeComplexity"
                    defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.timeComplexity || '' : ''}
                    placeholder="e.g., O(N log N)"
                    className="linear-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Space Complexity</label>
                  <input
                    type="text"
                    name="spaceComplexity"
                    defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.spaceComplexity || '' : ''}
                    placeholder="e.g., O(1)"
                    className="linear-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Related Problem IDs (comma-separated)</label>
                <input
                  type="text"
                  name="relatedProblems"
                  defaultValue={editingConceptId ? concepts.find(c => c.id === editingConceptId)?.relatedProblems.join(', ') || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  placeholder="eng-2703, eng-828"
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
                  {editingConceptId ? 'Update Concept' : 'Save Concept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptsPage;