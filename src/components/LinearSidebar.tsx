import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AppContext from '../contexts/AppContext';
import { LinearLogo } from './LinearNavbar';

interface LinearSidebarProps {
  onOpenNewItem?: () => void;
  onOpenSearch?: () => void;
}

const LinearSidebar: React.FC<LinearSidebarProps> = ({ onOpenNewItem, onOpenSearch }) => {
  const { problems, notes, concepts, mistakes } = useContext(AppContext)!;
  const unreviewedMistakesCount = mistakes.filter(m => !m.reviewedRecently).length;

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-white/[0.08] bg-[#08090a] select-none text-xs">
      {/* Workspace Switcher */}
      <div className="flex h-13 items-center justify-between border-b border-white/[0.08] px-3.5">
        <div className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-white/[0.05] transition-colors">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.08] text-white">
            <LinearLogo className="w-3 h-3" />
          </div>
          <span className="font-semibold text-white tracking-tight text-sm">Linear</span>
          <svg className="w-3 h-3 text-[#8a8f98]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Search (⌘K)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          {onOpenNewItem && (
            <button
              type="button"
              onClick={onOpenNewItem}
              className="p-1 rounded text-[#8a8f98] hover:text-white hover:bg-white/[0.06] transition-colors"
              title="New Issue (C)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Core System */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-[#62666f] uppercase">
            Workspace
          </div>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                  <span>Dashboard</span>
                </div>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/board"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18M15 3v18" />
                  </svg>
                  <span>Kanban Board</span>
                </div>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8a8f98]">
                  {problems.length}
                </span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/leetcode"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#5e6ad2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Problems</span>
                </div>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8a8f98]">
                  {problems.length}
                </span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/neetcode"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10M6 10h10" />
                  </svg>
                  <span>NeetCode 150</span>
                </div>
                <span className="rounded bg-[#f59e0b]/10 px-1.5 py-0.2 text-[10px] font-medium text-[#b98524]">
                  ROADMAP
                </span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* Knowledge Base */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-[#62666f] uppercase">
            Knowledge
          </div>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/notes"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#06b6d4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Notes</span>
                </div>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8a8f98]">
                  {notes.length}
                </span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/concepts"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#c084fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span>Concepts</span>
                </div>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8a8f98]">
                  {concepts.length}
                </span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/mistakes"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#f43f5e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" x2="12" y1="9" y2="13" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>
                  <span>Mistakes</span>
                </div>
                {unreviewedMistakesCount > 0 ? (
                  <span className="rounded-full bg-[#f43f5e]/20 text-[#f43f5e] px-1.5 py-0.2 text-[10px] font-semibold">
                    {unreviewedMistakesCount}
                  </span>
                ) : (
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8a8f98]">
                    {mistakes.length}
                  </span>
                )}
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/workspace"
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-2 py-1.5 font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Code Editor</span>
                </div>
                  <span className="rounded bg-[#10b981]/10 px-1.5 py-0.2 text-[9px] font-medium text-[#4fae88]">
                  LIVE
                </span>
              </NavLink>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Status / Footer info */}
      <div className="border-t border-white/[0.08] p-3 flex items-center justify-between text-[#8a8f98]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[11px]">System Online</span>
        </div>
        <span className="font-mono text-[10px] text-[#62666f]">v2.4.0</span>
      </div>
    </aside>
  );
};

export default LinearSidebar;
