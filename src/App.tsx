import { useState, useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppContext from './contexts/AppContext';
import AuthContext from './contexts/AuthContext';
import LinearNavbar from './components/LinearNavbar';
import LinearSidebar from './components/LinearSidebar';
import LinearCommandPalette from './components/LinearCommandPalette';
import ProblemForm from './components/ProblemForm';
import AiHelper from './components/AiHelper';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import UpdatePasswordForm from './components/auth/UpdatePasswordForm';

import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import LeetCodePage from './pages/LeetCodePage';
import NeetcodePage from './pages/NeetcodePage';
import NotesPage from './pages/NotesPage';
import ConceptsPage from './pages/ConceptsPage';
import MistakesPage from './pages/MistakesPage';
import CodeEditorPage from './pages/CodeEditorPage';

function App() {
  const { addProblem } = useContext(AppContext)!;
  const { user, isLoading } = useContext(AuthContext)!;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => window.location.hash.includes('type=recovery'));

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette on Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(open => !open);
      }
      // Quick create issue on 'c' (if not typing in input/textarea)
      if (
        e.key === 'c' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setIsNewIssueOpen(true);
      }
    };

    // Handle custom events for switching between login and signup
    const handleShowSignup = () => setShowSignup(true);
    const handleShowLogin = () => setShowSignup(false);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('show-signup', handleShowSignup);
    window.addEventListener('show-login', handleShowLogin);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('show-signup', handleShowSignup);
      window.removeEventListener('show-login', handleShowLogin);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#08090a] text-[#f7f8f8] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Loading...</h2>
          <p className="mt-2 text-[#8a8f98]">Please wait while we check your authentication status</p>
        </div>
      </div>
    );
  }

  if (isRecoveryMode) {
    return (
      <div className="flex min-h-screen flex-col bg-[#08090a]">
        <UpdatePasswordForm
          onComplete={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsRecoveryMode(false);
          }}
        />
      </div>
    );
  }

  // If no user is authenticated, show auth forms
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-[#08090a]">
        {!showSignup ? (
          <LoginForm />
        ) : (
          <SignupForm />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#08090a] text-[#f7f8f8]">
      {/* Top Linear Navigation Bar */}
      <LinearNavbar
        onOpenNewItem={() => setIsNewIssueOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Linear Sidebar */}
        <LinearSidebar
          onOpenNewItem={() => setIsNewIssueOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto bg-[#08090a] p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/leetcode" element={<LeetCodePage />} />
            <Route path="/neetcode" element={<NeetcodePage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/concepts" element={<ConceptsPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/workspace" element={<CodeEditorPage />} />
            <Route
              path="*"
              element={
                <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center text-xs text-[#8a8f98]">
                  <h2 className="text-base font-bold text-white mb-1">404 — Page Not Found</h2>
                  <p>The requested view does not exist.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>

      {/* Floating Linear Thread & AI Agent (Image 1) */}
      <AiHelper />

      {/* Global Command Palette (Cmd+K) */}
      <LinearCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenNewItem={() => {
          setIsSearchOpen(false);
          setIsNewIssueOpen(true);
        }}
      />

      {/* Global New Issue Modal Dialog */}
      {isNewIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#0c0d12] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#5e6ad2]">ENG</span>
                <span className="text-white text-xs">/</span>
                <h2 className="text-sm font-bold text-white">Create New Problem / Issue</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNewIssueOpen(false)}
                className="text-[#8a8f98] hover:text-white"
              >
                ✕
              </button>
            </div>

            <ProblemForm
              onSubmit={(problemData) => {
                addProblem(problemData);
                setIsNewIssueOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
