import React, { useContext, useState } from 'react';
import AppContext from '../contexts/AppContext';
import type { Problem, ProblemStatus } from '../types';
import LinearIssueDetail from '../components/LinearIssueDetail';
import ProblemForm from '../components/ProblemForm';

const COLUMNS: { id: ProblemStatus; label: string; icon: string; color: string }[] = [
  { id: 'Backlog', label: 'Backlog', icon: '⋯', color: 'text-[#8a8f98]' },
  { id: 'Todo', label: 'Todo', icon: '◯', color: 'text-white' },
  { id: 'In Progress', label: 'In Progress', icon: '◐', color: 'text-[#f59e0b]' },
  { id: 'Done', label: 'Done', icon: '✓', color: 'text-[#10b981]' },
];

const BoardPage: React.FC = () => {
  const { problems, updateProblem, deleteProblem, addProblem } = useContext(AppContext)!;
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetColumn, setTargetColumn] = useState<ProblemStatus>('Todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  const allTopics = Array.from(new Set(problems.flatMap(p => p.topics)));

  const filteredProblems = problems.filter(problem => {
    const matchesSearch = !searchQuery ||
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (problem.issueKey && problem.issueKey.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTopic = selectedTopic === 'All' || problem.topics.includes(selectedTopic);
    return matchesSearch && matchesTopic;
  });

  const getProblemsByStatus = (status: ProblemStatus) => {
    return filteredProblems.filter(problem => (problem.status || 'Todo') === status);
  };

  const handleOpenAdd = (column: ProblemStatus) => {
    setTargetColumn(column);
    setShowAddForm(true);
  };

  const getBadgeDotColor = (topic: string) => {
    const lower = topic.toLowerCase();
    if (lower.includes('bug') || lower.includes('error')) return 'bg-[#f43f5e]';
    if (lower.includes('design') || lower.includes('ui')) return 'bg-[#c084fc]';
    if (lower.includes('ai') || lower.includes('llm')) return 'bg-[#3b82f6]';
    if (lower.includes('perf') || lower.includes('optim')) return 'bg-[#10b981]';
    if (lower.includes('backend') || lower.includes('api')) return 'bg-[#f59e0b]';
    return 'bg-[#8a8f98]';
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Board Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#08090a] px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">Active Sprint Board</h1>
          <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-mono text-[#8a8f98]">
            {problems.length} issues
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title or ID..."
              className="linear-input w-48 sm:w-60 py-1.5 pl-8 pr-3 text-xs"
            />
            <svg
              className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#62666f]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Topic Filter */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="linear-input py-1.5 px-3 text-xs"
          >
            <option value="All">All Labels</option>
            {allTopics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleOpenAdd('Todo')}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-[#a6aab3] transition-colors hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add issue</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid (Image 1 recreation) */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex min-w-[1000px] h-full gap-5">
          {COLUMNS.map(column => {
            const columnProblems = getProblemsByStatus(column.id);
            return (
              <div
                key={column.id}
                className="flex flex-1 flex-col rounded-xl border border-white/[0.06] bg-[#0b0c0f]/50 p-3"
                /* Improved column demarcation: slightly darker background */
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${column.color}`}>{column.icon}</span>
                    <span className="text-xs font-semibold text-white">{column.label}</span>
                    <span className="text-xs text-[#62666f] font-mono">{columnProblems.length}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(column.id)}
                      className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-white/[0.06] transition-colors"
                      title={`Add issue to ${column.label}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Column options"
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1">
                  {columnProblems.map(problem => (
                    <div
                      key={problem.id}
                      onClick={() => setSelectedProblem(problem)}
                      className="linear-card group cursor-pointer p-3.5 select-none"
                    >
                      {/* Top Row: Issue Key + Assignee Avatar */}
                      <div className="flex items-center justify-between text-xs text-[#8a8f98] mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-[#62666f] group-hover:text-white transition-colors">
                            {problem.issueKey || 'ENG-828'}
                          </span>
                          {problem.priority === 'Urgent' && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#f43f5e] animate-pulse" title="Urgent priority" />
                          )}
                        </div>

                        {/* Assignee Avatar */}
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e202b] text-[10px] text-white border border-white/[0.1] font-semibold"
                          title={`Assigned to ${problem.assignee?.name || 'team'}`}
                        >
                          {problem.assignee?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs font-semibold text-white tracking-tight leading-snug line-clamp-2 mb-3">
                        {problem.title}
                      </h4>

                      {/* Bottom Row: Options icon + Badges (Image 1 style) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-[#62666f] hover:text-white transition-colors px-1">
                          ⋯
                        </span>

                        {/* Topic Pills with Colored Dot - Improved padding for better hit areas and readability */}
                        {problem.topics.slice(0, 2).map((topic, i) => (
                          <span key={i} className="linear-tag">
                            <span className={`h-2 w-2 rounded-full ${getBadgeDotColor(topic)} flex items-center justify-center`} />
                            <span className="text-xs font-medium text-white">{topic}</span>
                          </span>
                        ))}

                        {/* Git Branch / PR Badge */}
                        {problem.gitBranch && (
                          <span className="flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#8a8f98]">
                            <svg className="w-2.5 h-2.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="6" x2="6" y1="3" y2="15" />
                              <circle cx="18" cy="6" r="3" />
                              <circle cx="6" cy="18" r="3" />
                              <path d="M18 9a9 9 0 0 1-9 9" />
                            </svg>
                            {problem.gitBranch}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty State Contrast Improvement */}
                  {columnProblems.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/[0.08] p-6 text-center text-xs text-[#62666f]">
                      <div className="flex flex-col items-center gap-2">
                        <span className="opacity-50">
                          {/* Dimmed icon to make board look intentional */}
                          ⬚
                        </span>
                        <span className="font-medium text-white/80">
                          No issues in {column.label}
                        </span>
                        <span className="text-xs text-[#62666f]/60">
                          Click "+" to add
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Linear Issue Detail Inspector Modal (Image 2) */}
      {selectedProblem && (
        <LinearIssueDetail
          problem={selectedProblem}
          allProblems={problems}
          onClose={() => setSelectedProblem(null)}
          onUpdate={(id, updates) => {
            updateProblem(id, updates);
            setSelectedProblem(prev => prev ? { ...prev, ...updates } : null);
          }}
          onDelete={(id) => {
            deleteProblem(id);
            setSelectedProblem(null);
          }}
          onSelectProblem={(p) => setSelectedProblem(p)}
        />
      )}

      {/* Add Problem Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <h2 className="text-lg font-bold text-white">Create New Issue ({targetColumn})</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>
            <ProblemForm
              onSubmit={(data) => {
                addProblem({
                  ...data,
                  status: targetColumn,
                });
                setShowAddForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;