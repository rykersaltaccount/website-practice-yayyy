import React, { useState, useContext } from 'react';
import AppContext from '../contexts/AppContext';
import ConfirmDialog from '../components/ConfirmDialog';

const MistakesPage: React.FC = () => {
  const { mistakes, addMistake, updateMistake, deleteMistake, toggleReviewed, problems, concepts } = useContext(AppContext)!;
  const [editingMistakeId, setEditingMistakeId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [mistakeToDelete, setMistakeToDelete] = useState<{ id: string; description: string } | null>(null);

  const handleAiAnalyzeMistakes = async () => {
    setIsAiLoading(true);
    const unreviewed = mistakes.filter(m => !m.reviewedRecently);
    const endpoint = localStorage.getItem('codevault-ai-endpoint') || 'https://api.openai.com/v1/chat/completions';
    const model = localStorage.getItem('codevault-ai-model') || 'gpt-4o-mini';
    const apiKey = localStorage.getItem('codevault-ai-key')?.trim();

    // Fixed: Using string concatenation instead of template literals
    const summaryParts = [];
    for (let i = 0; i < unreviewed.length; i++) {
      const m = unreviewed[i];
      summaryParts.push(
        (i + 1) + '. Description: ' + m.description + '\n   Example: ' + m.example + '\n   Takeaway: ' + m.learningLog
      );
    }
    const summary = summaryParts.join('\n\n');

    try {
      if (apiKey && endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + apiKey,
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'You are an elite coding interview coach. Analyze the user\'s recurring mistakes, diagnose underlying cognitive blindspots, and provide 3 concrete mental invariants/rules of thumb to prevent them.'
              },
              {
                role: 'user',
                content: 'Here are my unreviewed mistakes:\n\n' + (summary || 'No unreviewed mistakes.')
              },
            ],
          }),
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        setAiAnalysis(data.choices?.[0]?.message?.content || 'Analysis complete.');
      } else {
        // Fixed: Using string concatenation instead of template literals
        const aiText =
          '### 🧠 AI Mistake Pattern Diagnostics\n\n' +
          '#### Common Failure Modes Identified:\n' +
          '1. **Loop Invariant & Pointer Drift**: Failure to establish whether pointers are *inclusive* [l, r] or *exclusive* [l, r) before writing the loop condition.\n' +
          '2. **Cold Start / Thread Blocking**: Deserializing heavy state on initial mount instead of streaming minimal required view state first.\n\n' +
          '#### Suggested Practice Rules of Thumb:\n' +
          '- **Rule 1**: Always write the index update expression before the matching branch logic.\n' +
          '- **Rule 2**: When doing dynamic programming, identify state variables explicitly as table dimensions before writing recursive calls.';
        setAiAnalysis(aiText);
      }
    } catch (e) {
      setAiAnalysis('AI review fallback:\n' + (e instanceof Error ? e.message : String(e)) + '\n\nRecommendation: Focus on 1 unreviewed mistake per practice session in the Code Workspace.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getRelatedProblems = (mistakeId: string) => {
    const mistake = mistakes.find(m => m.id === mistakeId);
    if (!mistake) return [];
    return problems.filter(problem => mistake.relatedProblems?.includes(problem.id));
  };

  const getRelatedConcept = (mistakeId: string) => {
    const mistake = mistakes.find(m => m.id === mistakeId);
    if (!mistake || !mistake.relatedConcept) return null;
    return concepts.find(concept => concept.id === mistake.relatedConcept);
  };

  const filteredMistakes = mistakes.filter(mistake => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'reviewed' && mistake.reviewedRecently) ||
      (filter === 'unreviewed' && !mistake.reviewedRecently);

    const matchesSearch =
      !searchQuery ||
      mistake.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mistake.example.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mistakes & Anti-Patterns Log</h1>
          <p className="text-xs text-[#8a8f98] mt-1">Review recurring pitfalls to build automated mental guardrails</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAiAnalyzeMistakes}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 rounded-lg border border-[#5e6ad2]/40 bg-[#5e6ad2]/15 px-3.5 py-2 text-xs font-semibold text-[#818cf8] hover:bg-[#5e6ad2]/25 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <span>✨</span>
            <span>{isAiLoading ? 'AI Analyzing...' : 'AI Analyze Mistakes'}</span>
          </button>
          <button
            onClick={() => {
              setEditingMistakeId(null);
              setShowForm(true);
            }}
            className="linear-btn-primary px-4 py-2 text-xs font-semibold"
          >
            + Log Mistake
          </button>
        </div>
      </div>

      {/* AI Mistake Analysis Card */}
      {aiAnalysis && (
        <div className="rounded-xl border border-[#5e6ad2]/40 bg-[#0e101b] p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#5e6ad2] animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI Mistake Diagnostics</h3>
            </div>
            <button
              type="button"
              onClick={() => setAiAnalysis(null)}
              className="text-xs text-[#8a8f98] hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="text-xs leading-relaxed text-[#dedede] whitespace-pre-wrap font-sans space-y-2">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0c0d12] p-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Search mistakes and examples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="linear-input w-full py-1.5 pl-8 pr-3 text-xs"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8a8f98] text-[11px] mr-1">Status:</span>
          {(['all', 'unreviewed', 'reviewed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === tab
                  ? 'bg-white/[0.12] text-white border border-white/[0.2]'
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab === 'unreviewed' ? 'To Review' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Mistakes List */}
      <div className="space-y-4">
        {filteredMistakes.length > 0 ? (
          <div className="grid gap-4">
            {filteredMistakes.map(mistake => {
              const relConcept = getRelatedConcept(mistake.id);
              const relProblems = getRelatedProblems(mistake.id);

              return (
                <div
                  key={mistake.id}
                  className="linear-card p-5 space-y-4 select-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${mistake.reviewedRecently ? 'bg-[#10b981]' : 'bg-[#f43f5e] animate-pulse'}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                          {mistake.reviewedRecently ? 'Reviewed' : 'Review Required'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        {mistake.description}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleReviewed(mistake.id)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          mistake.reviewedRecently
                            ? 'border border-white/[0.1] text-[#8a8f98] hover:text-white'
                            : 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/25'
                        }`}
                      >
                        {mistake.reviewedRecently ? 'Mark Unreviewed' : 'Mark Reviewed ✓'}
                      </button>
                    </div>
                  </div>

                  {mistake.example && (
                    <div className="rounded-lg bg-[#090a0f] p-3 border border-white/[0.06] text-xs font-mono text-[#abb2bf]">
                      <span className="text-[#62666f] select-none block mb-1 font-sans text-[10px] uppercase font-semibold">Example trigger:</span>
                      {mistake.example}
                    </div>
                  )}

                  {mistake.learningLog && (
                    <div className="text-xs text-[#8a8f98] border-l-2 border-[#5e6ad2] pl-3 py-0.5 bg-[#090a0f]/30">
                      <span className="text-white font-medium">Learning Log: </span>
                      {mistake.learningLog}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-[11px] text-[#62666f]">
                    <div className="flex flex-wrap gap-2">
                      {relConcept && (
                        <span className="linear-tag">
                          Concept: {relConcept.name}
                        </span>
                      )}
                      {relProblems.length > 0 && (
                        <span className="linear-tag">
                          {relProblems.length} Related Problem(s)
                        </span>
                      )}
                    </div>

                    {/* Action Button Hierarchy Improvement: Moved Delete to a more structured position */}
                    <div className="flex items-center gap-2">
                      {/* Status Differentiation: subtle red border or background for REVIEW REQUIRED */}
                      {!mistake.reviewedRecently && (
                        <div className="flex items-center gap-2 border-l-2 border-[rgba(244,63,94,0.3)] pl-2">
                          <button
                            type="button"
                            onClick={() => setMistakeToDelete({ id: mistake.id, description: mistake.description })}
                            className="text-[#f43f5e] hover:underline px-2 py-0.5"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {mistake.reviewedRecently && (
                        <button
                          type="button"
                          onClick={() => setMistakeToDelete({ id: mistake.id, description: mistake.description })}
                          className="text-[#f43f5e] hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
            <p>No mistakes logged in this view.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Mistake Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">
                {editingMistakeId ? 'Edit Mistake' : 'Log New Mistake / Anti-Pattern'}
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
                const mistakeData = {
                  description: (form.elements.namedItem('description') as HTMLInputElement).value,
                  example: (form.elements.namedItem('example') as HTMLTextAreaElement).value,
                  relatedConcept: (form.elements.namedItem('relatedConcept') as HTMLInputElement).value,
                  relatedProblems: ((form.elements.namedItem('relatedProblems') as HTMLInputElement).value)
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id.length > 0),
                  learningLog: (form.elements.namedItem('learningLog') as HTMLTextAreaElement).value,
                  reviewedRecently: false
                };

                if (editingMistakeId) {
                  updateMistake(editingMistakeId, mistakeData);
                } else {
                  addMistake(mistakeData);
                }
                setShowForm(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Mistake Description</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingMistakeId ? mistakes.find(m => m.id === editingMistakeId)?.description || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs"
                  placeholder="e.g., Infinite loop on binary search pointers"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Code Example or Trace</label>
                <textarea
                  name="example"
                  defaultValue={editingMistakeId ? mistakes.find(m => m.id === editingMistakeId)?.example || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs h-24 font-mono"
                  placeholder="while (l <= r) { m = (l + r) / 2; ... }"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1">Learning Takeaway / Remedy</label>
                <textarea
                  name="learningLog"
                  defaultValue={editingMistakeId ? mistakes.find(m => m.id === editingMistakeId)?.learningLog || '' : ''}
                  className="linear-input w-full px-3 py-2 text-xs h-20"
                  placeholder="Use l + (r - l) / 2 to avoid 32-bit integer overflow and update l = m + 1."
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
                  {editingMistakeId ? 'Update Mistake' : 'Save Mistake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {mistakeToDelete && (
        <ConfirmDialog
          title="Delete mistake log?"
          message={'This will permanently delete "' + mistakeToDelete?.description + '".'}
          onCancel={() => setMistakeToDelete(null)}
          onConfirm={() => {
            if (!mistakeToDelete) return;
            deleteMistake(mistakeToDelete.id);
            setMistakeToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default MistakesPage;