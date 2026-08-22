import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AppContext from '../contexts/AppContext';

interface LinearCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewItem: () => void;
}

const LinearCommandPalette: React.FC<LinearCommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenNewItem,
}) => {
  const navigate = useNavigate();
  const { problems, notes, concepts, mistakes } = useContext(AppContext)!;
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalized = query.toLowerCase().trim();

  const matchingProblems = problems.filter(p =>
    !normalized || p.title.toLowerCase().includes(normalized) || (p.issueKey && p.issueKey.toLowerCase().includes(normalized))
  ).slice(0, 4);

  const matchingNotes = notes.filter(n =>
    !normalized || n.title.toLowerCase().includes(normalized) || n.tags.some(t => t.toLowerCase().includes(normalized))
  ).slice(0, 3);

  const matchingConcepts = concepts.filter(c =>
    !normalized || c.name.toLowerCase().includes(normalized)
  ).slice(0, 3);

  const matchingMistakes = mistakes.filter(m =>
    !normalized || m.description.toLowerCase().includes(normalized) || m.example.toLowerCase().includes(normalized)
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-16 sm:pt-24 backdrop-blur-md animate-fadeIn">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-[#0c0d12] shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3 bg-[#0e1015]">
          <svg className="w-4 h-4 text-[#8a8f98]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search issues, notes, concepts..."
            autoFocus
            className="flex-1 bg-transparent text-xs text-white placeholder:text-[#62666f] outline-none"
          />
          <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-[#8a8f98]">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-2 text-xs divide-y divide-white/[0.04]">
          {/* Quick Actions */}
          <div className="p-2 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666f] px-2 block mb-1">
              Actions
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewItem();
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[#5e6ad2] font-bold">+</span>
                <span>Create new issue / problem</span>
              </div>
              <kbd className="font-mono text-[10px] text-[#62666f]">C</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/board');
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[#f59e0b]">◐</span>
                <span>Open Active Kanban Board</span>
              </div>
              <kbd className="font-mono text-[10px] text-[#62666f]">G B</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/workspace');
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[#10b981]">▶</span>
                <span>Open Code Workspace</span>
              </div>
              <kbd className="font-mono text-[10px] text-[#62666f]">G W</kbd>
            </button>
          </div>

          {/* Problems Matching */}
          {matchingProblems.length > 0 && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666f] px-2 block mb-1">
                Problems ({matchingProblems.length})
              </span>
              {matchingProblems.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/leetcode');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[11px] text-[#62666f]">{p.issueKey || 'ENG'}</span>
                    <span className="truncate">{p.title}</span>
                  </div>
                  <span className="linear-tag">{p.difficulty}</span>
                </button>
              ))}
            </div>
          )}

          {/* Notes Matching */}
          {matchingNotes.length > 0 && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666f] px-2 block mb-1">
                Notes ({matchingNotes.length})
              </span>
              {matchingNotes.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/notes');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
                >
                  <span className="truncate">{n.title}</span>
                  <span className="text-[10px] text-[#8a8f98] font-mono">{n.category || 'Note'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Concepts Matching */}
          {matchingConcepts.length > 0 && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666f] px-2 block mb-1">
                Concepts ({matchingConcepts.length})
              </span>
              {matchingConcepts.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/concepts');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-[#c084fc]">Concept</span>
                </button>
              ))}
            </div>
          )}

          {/* Mistakes Matching */}
          {matchingMistakes.length > 0 && (
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666f] px-2 block mb-1">
                Mistakes ({matchingMistakes.length})
              </span>
              {matchingMistakes.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/mistakes');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-white/[0.06] text-white transition-colors"
                >
                  <span className="truncate">{m.description}</span>
                  <span className="text-[10px] text-[#f43f5e]">Mistake</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinearCommandPalette;
