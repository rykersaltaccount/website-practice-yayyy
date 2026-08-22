import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

interface LinearNavbarProps {
  onOpenNewItem?: () => void;
  onOpenSearch?: () => void;
}

export const LinearLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 100 100" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 0L0 50l50 50 50-50L50 0zm0 14.14L85.86 50 50 85.86 14.14 50 50 14.14z" />
    <path d="M50 28.28L28.28 50 50 71.72 71.72 50 50 28.28z" opacity="0.6" />
  </svg>
);

const LinearNavbar: React.FC<LinearNavbarProps> = ({ onOpenNewItem, onOpenSearch }) => {
  const { user, logout } = useContext(AuthContext)!;
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Get user initials for avatar (fallback to 'AD' if no user or name)
  const getUserInitials = (name: string | undefined): string => {
    if (!name) return 'AD';
    
    // Split by spaces and take first letter of first two words, or first two letters of first word
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      return (nameParts[0][0]?.toUpperCase() || 'A') + (nameParts[1][0]?.toUpperCase() || 'D');
    } else {
      // Single word, take first two characters
      const firstTwo = name.substring(0, 2);
      return (firstTwo[0]?.toUpperCase() || 'A') + (firstTwo[1]?.toUpperCase() || 'D');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-13 w-full items-center justify-between border-b border-white/[0.08] bg-[#08090a]/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Brand */}
      <div className="flex items-center gap-6">
        <NavLink to="/" className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-85">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.06] text-white">
            <LinearLogo className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Linear</span>
        </NavLink>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-[#8a8f98] transition-all hover:border-white/[0.16] hover:text-white hover:bg-white/[0.06]"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-[#8a8f98] sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="hidden h-4 w-[1px] bg-white/[0.1] sm:block" />

        {/* Action Button: Pill Button matching Image 1 / Image 2 */}
        {onOpenNewItem && (
          <button
            type="button"
            onClick={onOpenNewItem}
            className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#08090a] transition-all hover:bg-[#eaeaea] hover:shadow-[0_0_16px_rgba(255,255,255,0.2)] active:scale-95"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>New Issue</span>
          </button>
        )}

        {/* User profile menu */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen(open => !open)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.12] bg-[#1c1d22] text-xs font-medium text-white shadow-sm hover:bg-white/[0.06] transition-colors"
            >
              <span className="bg-gradient-to-tr from-[#5e6ad2] to-[#c084fc] bg-clip-text text-transparent font-bold">
                {getUserInitials(user.name)}
              </span>
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-white/[0.12] bg-[#0c0d12] p-1.5 shadow-2xl">
                <div className="border-b border-white/[0.08] px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-white">{user.name}</p>
                  <p className="truncate text-[10px] text-[#8a8f98]">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="mt-1 w-full rounded-md px-2.5 py-2 text-left text-xs text-[#f43f5e] transition-colors hover:bg-[#f43f5e]/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.12] bg-[#1c1d22] text-xs font-medium text-white shadow-sm">
            <span className="bg-gradient-to-tr from-[#5e6ad2] to-[#c084fc] bg-clip-text text-transparent font-bold">
              AD
            </span>
          </div>
        )}
        
      </div>
    </header>
  );
};

export default LinearNavbar;
