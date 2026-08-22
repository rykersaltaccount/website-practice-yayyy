import React, { useState } from 'react';
import type { Problem } from '../types';
import { useProblems } from '../hooks/useProblems';
import LinearIssueDetail from './LinearIssueDetail';

interface ProblemListProps {
  problems?: Problem[];
  title?: string;
}

const ProblemList: React.FC<ProblemListProps> = ({ problems, title }) => {
  const { problems: allProblems, updateProblem, deleteProblem } = useProblems();
  const displayProblems = problems ?? allProblems;
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  if (!displayProblems || displayProblems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
        <p>No problems found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8a8f98]">
          {title} ({displayProblems.length})
        </h2>
      )}

      <div className="rounded-xl border border-white/[0.08] bg-[#0c0d12] overflow-hidden">
        <div className="divide-y divide-white/[0.05]">
          {displayProblems.map(problem => (
            <div
              key={problem.id}
              onClick={() => setSelectedProblem(problem)}
              className="flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer group select-none"
            >
              {/* Left Side: Key + Status Dot + Title */}
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="font-mono text-xs font-medium text-[#62666f] group-hover:text-white transition-colors w-20 shrink-0">
                  {problem.issueKey || 'ENG-828'}
                </span>

                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  problem.status === 'Done' ? 'bg-[#10b981]' :
                  problem.status === 'In Progress' ? 'bg-[#f59e0b]' :
                  'border border-white/50'
                }`} />

                <span className="text-xs font-semibold text-white tracking-tight truncate">
                  {problem.title}
                </span>
              </div>

              {/* Right Side: Topics + Difficulty + Assignee + Link */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex items-center gap-1.5">
                  {problem.topics.slice(0, 3).map((topic, i) => (
                    <span key={i} className="linear-tag">
                      {topic}
                    </span>
                  ))}
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    problem.difficulty === 'Easy'
                      ? 'text-[#10b981] bg-[#10b981]/10'
                      : problem.difficulty === 'Medium'
                      ? 'text-[#f59e0b] bg-[#f59e0b]/10'
                      : 'text-[#f43f5e] bg-[#f43f5e]/10'
                  }`}
                >
                  {problem.difficulty}
                </span>

                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e202b] text-[10px] text-white border border-white/[0.1] font-semibold"
                  title={problem.assignee?.name || 'Unassigned'}
                >
                  {problem.assignee?.name?.[0]?.toUpperCase() || 'U'}
                </div>

                {problem.leetCodeUrl && (
                  <a
                    href={problem.leetCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-[#62666f] hover:text-[#5e6ad2] transition-colors"
                    title="Open on LeetCode"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Linear Issue Detail Inspector Modal (Image 2) */}
      {selectedProblem && (
        <LinearIssueDetail
          problem={selectedProblem}
          allProblems={displayProblems}
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
    </div>
  );
};

export default ProblemList;