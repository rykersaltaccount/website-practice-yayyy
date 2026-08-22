import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import AppContext from '../contexts/AppContext';
import type { Problem } from '../types';
import LinearIssueDetail from '../components/LinearIssueDetail';
import ConfirmDialog from '../components/ConfirmDialog';
import WeeklyActivity from '../components/WeeklyActivity';

const DashboardPage: React.FC = () => {
  const { problems, notes, concepts, mistakes, loadDemoProblems, clearDemoProblems, updateProblem, deleteProblem } = useContext(AppContext)!;
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);

  const handleLoadDemo = () => {
    if (window.confirm('Load demo sprint issues and problems?')) {
      loadDemoProblems();
    }
  };

  const handleClearDemo = () => {
    setShowClearDemoConfirm(true);
  };

  const unreviewedMistakes = mistakes.filter(m => !m.reviewedRecently);
  const inProgressProblems = problems.filter(p => p.status === 'In Progress');
  const doneProblems = problems.filter(p => p.status === 'Done');

  const problemsByDifficulty = {
    Easy: problems.filter(p => p.difficulty === 'Easy').length,
    Medium: problems.filter(p => p.difficulty === 'Medium').length,
    Hard: problems.filter(p => p.difficulty === 'Hard').length,
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Metrics Row (Moved to Top) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NavLink
          to="/board"
          className="linear-card group p-5 flex flex-col justify-between hover:border-[#5e6ad2]/40"
        >
          <div className="flex items-center justify-between text-[#8a8f98] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Issues</span>
            <span className="h-2 w-2 rounded-full bg-[#5e6ad2]" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">{problems.length}</div>
            <p className="text-xs text-[#8a8f98] mt-1">
              <span className="text-[#f59e0b] font-medium">{inProgressProblems.length} in progress</span> • {doneProblems.length} completed
            </p>
          </div>
        </NavLink>

        <NavLink
          to="/notes"
          className="linear-card group p-5 flex flex-col justify-between hover:border-[#06b6d4]/40"
        >
          <div className="flex items-center justify-between text-[#8a8f98] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Engineering Notes</span>
            <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">{notes.length}</div>
            <p className="text-xs text-[#8a8f98] mt-1">Knowledge documentation</p>
          </div>
        </NavLink>

        <NavLink
          to="/concepts"
          className="linear-card group p-5 flex flex-col justify-between hover:border-[#c084fc]/40"
        >
          <div className="flex items-center justify-between text-[#8a8f98] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Concepts</span>
            <span className="h-2 w-2 rounded-full bg-[#c084fc]" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">{concepts.length}</div>
            <p className="text-xs text-[#8a8f98] mt-1">Algorithms & System Design</p>
          </div>
        </NavLink>

        <NavLink
          to="/mistakes"
          className="linear-card group p-5 flex flex-col justify-between hover:border-[#f43f5e]/40"
        >
          <div className="flex items-center justify-between text-[#8a8f98] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Mistakes Log</span>
            <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {unreviewedMistakes.length}
            </div>
            <p className="text-xs text-[#8a8f98] mt-1">
              {unreviewedMistakes.length > 0 ? (
                <span className="text-[#f43f5e] font-medium">To review & correct</span>
              ) : (
                <span className="text-[#10b981]">All reviewed!</span>
              )}
            </p>
          </div>
        </NavLink>
      </section>

      {/* Page Header */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[11px] font-medium text-white">System Online</span>
        </div>
        <div className="flex items-center gap-3">
          <NavLink
            to="/board"
            className="text-[#5e6ad2] hover:underline flex items-center gap-1 font-medium"
          >
            View Active Board →
          </NavLink>
          <NavLink
            to="/workspace"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#121318] px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:bg-[#1b1c24] hover:border-white/[0.2] hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] active:scale-95"
          >
            <span className="bg-gradient-to-r from-[#5e6ad2] to-[#c084fc] bg-clip-text text-transparent font-bold">New</span>
            <span>Coding Sessions →</span>
          </NavLink>
        </div>
      </div>

      {/* Embedded Linear Issue Window */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Featured Sprint Issues</h2>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-mono text-[#8a8f98]">
              {problems.slice(0, 5).length} shown
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDemo}
              className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-[#8a8f98] hover:border-white/[0.16] hover:text-white transition-colors"
            >
              Load Demo Sprint
            </button>
            {problems.some(p => p.title.startsWith('[Demo]')) && (
              <button
                type="button"
                onClick={handleClearDemo}
                className="rounded-md border border-[#f43f5e]/30 px-2.5 py-1 text-xs text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-colors"
              >
                Clear Demo
              </button>
            )}
          </div>
        </div>

        {/* Issue Table (Linear List View) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0d12] overflow-hidden">
          <div className="divide-y divide-white/[0.05]">
            {problems.slice(0, 6).map(problem => (
              <div
                key={problem.id}
                onClick={() => setSelectedProblem(problem)}
                className="flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                {/* Left: ID + Title + Status Dot */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <span className="font-mono text-xs font-medium text-[#62666f] group-hover:text-white transition-colors w-20 shrink-0">
                    {problem.issueKey || 'ENG-2703'}
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

                {/* Right: Badges & Assignee */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5">
                    {problem.topics.slice(0, 2).map((topic, i) => (
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activity and insights */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeeklyActivity />
        {/* Difficulty Breakdown */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-semibold text-white">Algorithm Breakdown</h3>
            <span className="text-xs text-[#8a8f98] font-mono">{problems.length} Total</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#10b981] font-medium">Easy</span>
                <span className="text-white font-mono">{problemsByDifficulty.Easy}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-[#10b981]"
                  style={{ width: `${(problemsByDifficulty.Easy / (problems.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#f59e0b] font-medium">Medium</span>
                <span className="text-white font-mono">{problemsByDifficulty.Medium}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-[#f59e0b]"
                  style={{ width: `${(problemsByDifficulty.Medium / (problems.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#f43f5e] font-medium">Hard</span>
                <span className="text-white font-mono">{problemsByDifficulty.Hard}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-[#f43f5e]"
                  style={{ width: `${(problemsByDifficulty.Hard / (problems.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unreviewed Mistakes Quick Action */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-semibold text-white">Mistakes to Review</h3>
            <NavLink to="/mistakes" className="text-xs text-[#5e6ad2] hover:underline">
              View all →
            </NavLink>
          </div>

          <div className="space-y-3">
            {unreviewedMistakes.slice(0, 3).map(mistake => (
              <div key={mistake.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white line-clamp-2">{mistake.description}</p>
                  <span className="h-2 w-2 rounded-full bg-[#f43f5e] shrink-0 mt-1" />
                </div>
                {mistake.example && (
                  <p className="font-mono text-[11px] text-[#8a8f98] mt-1 truncate">
                    {mistake.example}
                  </p>
                )}
              </div>
            ))}

            {unreviewedMistakes.length === 0 && (
              <div className="py-6 text-center text-xs text-[#8a8f98]">
                ✓ All logged mistakes reviewed!
              </div>
            )}
          </div>
        </div>
      </section>

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
      {showClearDemoConfirm && (
        <ConfirmDialog
          title="Remove demo issues?"
          message="This will remove all generated demo problems from your workspace."
          confirmLabel="Remove demo issues"
          onCancel={() => setShowClearDemoConfirm(false)}
          onConfirm={() => {
            clearDemoProblems();
            setShowClearDemoConfirm(false);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;