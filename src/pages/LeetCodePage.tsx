import React, { useEffect, useState } from 'react';
import { useProblems } from '../hooks/useProblems';
import ProblemList from '../components/ProblemList';
import ProblemForm from '../components/ProblemForm';
import type { Problem } from '../types';
import { PROGRAMMING_FILTER_CATEGORIES, PROGRAMMING_FILTERS } from '../utils/programmingFilters';

const LeetCodePage: React.FC = () => {
  const { problems, addProblem, updateProblem } = useProblems();
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<Problem['difficulty'] | 'All'>('All');
  const [topicFilter, setTopicFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customFilters, setCustomFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem('codevault-custom-filters');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.every(filter => typeof filter === 'string') ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newFilter, setNewFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('codevault-custom-filters', JSON.stringify(customFilters));
  }, [customFilters]);

  const topicFilters = Array.from(new Set([
    ...PROGRAMMING_FILTERS,
    ...customFilters,
    ...problems.flatMap(problem => problem.topics),
  ])).sort((first, second) => first.localeCompare(second));

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredProblems = problems.filter(problem => {
    const matchesDifficulty = difficultyFilter === 'All' || problem.difficulty === difficultyFilter;
    const searchableText = [problem.title, problem.leetCodeUrl, ...(problem.issueKey ? [problem.issueKey] : []), ...problem.topics]
      .join(' ')
      .toLowerCase();
    const matchesSearch = !normalizedSearchQuery || searchableText.includes(normalizedSearchQuery);
    const matchesTopic = topicFilter === 'All'
      || problem.topics.some(topic => topic.toLowerCase() === topicFilter.toLowerCase());

    return matchesDifficulty && matchesSearch && matchesTopic;
  });

  const handleAddCustomFilter = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedFilter = newFilter.trim();
    const alreadyExists = topicFilters.some(filter => filter.toLowerCase() === trimmedFilter.toLowerCase());

    if (!trimmedFilter || alreadyExists) {
      return;
    }

    setCustomFilters(filters => [...filters, trimmedFilter]);
    setNewFilter('');
    setTopicFilter(trimmedFilter);
  };

  const handleAddProblem = (problemData: Omit<Problem, 'id'>) => {
    addProblem(problemData);
    setShowForm(false);
  };

  const handleUpdateProblem = (_problemData: Omit<Problem, 'id'>) => {
    if (editingProblemId) {
      updateProblem(editingProblemId, _problemData);
      setEditingProblemId(null);
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Algorithm & LeetCode Tracker</h1>
          <p className="text-xs text-[#8a8f98] mt-1">Track solutions, patterns, and reflections with Linear issue precision</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingProblemId(null);
              setShowForm(true);
            }}
            className="linear-btn-primary px-4 py-2 text-xs font-semibold"
          >
            + New Problem
          </button>
        </div>
      </div>

      {/* Filter Controls (Linear Filter Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0c0d12] p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Search problems, topics, IDs..."
            className="linear-input w-full py-1.5 pl-8 pr-3 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#62666f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Difficulty Pill Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8a8f98] text-[11px] mr-1">Difficulty:</span>
          {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
            <button
              key={diff}
              type="button"
              onClick={() => setDifficultyFilter(diff)}
              className={`rounded-md px-2.5 py=1 text-xs font-medium transition-colors ${
                difficultyFilter === diff
                  ? 'bg-white/[0.20] text-white border border-white/[0.3]' /* Improved active state clarity: solid fill */
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        {/* Topic Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <select
            id="topic-filter"
            value={topicFilter}
            onChange={(event) => setTopicFilter(event.target.value)}
            className="linear-input py-1.5 px-3 text-xs"
          >
            <option value="All">All Categories</option>
            {Object.entries(PROGRAMMING_FILTER_CATEGORIES).map(([category, filters]) => (
              <optgroup key={category} label={category}>
                {filters.map(filter => (
                  <option key={filter} value={filter}>{filter}</option>
                ))}
              </optgroup>
            ))}
            {customFilters.length > 0 && (
              <optgroup label="Your filters">
                {customFilters.map(filter => (
                  <option key={filter} value={filter}>{filter}</option>
                ))}
              </optgroup>
            )}
            {topicFilters
              .filter(filter => !PROGRAMMING_FILTERS.includes(filter as never) && !customFilters.includes(filter))
              .map(filter => <option key={filter} value={filter}>{filter}</option>)}
          </select>
        </div>
      </div>

      {/* Custom Tag Management - Improved Filter Alignment */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0b0c10] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Custom Filters</span>
          <form onSubmit={handleAddCustomFilter} className="flex gap-2 flex-wrap items-center">
            {/* Improved Filter Alignment: input and button directly following the label */}
            <span className="flex items-center gap-2">
              <input
                type="text"
                value={newFilter}
                onChange={(event) => setNewFilter(event.target.value)}
                placeholder="e.g., Trie, Bit Manipulation"
                className="linear-input py-1 px-2.5 text-xs w-48"
              />
              <button type="submit" className="linear-btn-primary px-3 py-1 text-xs">
                Add Filter
              </button>
            </span>
          </form>
        </div>

        {customFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {customFilters.map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setCustomFilters(filters => filters.filter(existing => existing !== filter));
                  if (topicFilter === filter) setTopicFilter('All');
                }}
                className="linear-tag hover:border-red-400/40 hover:text-red-300 transition-colors"
                title={`Remove ${filter}`}
              >
                <span>{filter}</span>
                <span className="text-[10px]">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Problems List View - Improved List Item Spacing */}
      <div className="max-w-[800px]">
        <ProblemList
          title="Your Tracked Problems"
          problems={filteredProblems}
        />
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0e1015] p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/[0.08] mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingProblemId ? 'Edit Problem' : 'Log New LeetCode Problem'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>
            <ProblemForm
              onSubmit={editingProblemId ? handleUpdateProblem : handleAddProblem}
              isEditMode={!!editingProblemId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LeetCodePage;