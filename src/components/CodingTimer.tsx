import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../contexts/AppContext';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const CodingTimer: React.FC = () => {
  const { activeCodingStartedAt, startCoding, stopCoding } = useContext(AppContext)!;
  const [phase, setPhase] = useState<'work' | 'rest' | 'ready'>(() => (localStorage.getItem('codevault-pomodoro-phase') as 'work' | 'rest' | 'ready') || 'ready');
  const [phaseStartedAt, setPhaseStartedAt] = useState<string | null>(() => localStorage.getItem('codevault-pomodoro-phase-start'));
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);

  useEffect(() => {
    if (activeCodingStartedAt && phase === 'ready') {
      setPhase('work');
      setPhaseStartedAt(activeCodingStartedAt);
      return;
    }
    localStorage.setItem('codevault-pomodoro-phase', phase);
    if (phaseStartedAt) localStorage.setItem('codevault-pomodoro-phase-start', phaseStartedAt);
    else localStorage.removeItem('codevault-pomodoro-phase-start');
  }, [phase, phaseStartedAt]);

  useEffect(() => {
    if ((phase === 'work' && !activeCodingStartedAt) || !phaseStartedAt || phase === 'ready') {
      setRemainingSeconds(phase === 'rest' ? 5 * 60 : 25 * 60);
      return;
    }

    const updateElapsed = () => {
      const duration = phase === 'work' ? 25 * 60 : 5 * 60;
      const remaining = Math.max(0, duration - Math.floor((Date.now() - new Date(phaseStartedAt).getTime()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        if (phase === 'work') {
          stopCoding();
          setPhase('rest');
          setPhaseStartedAt(new Date().toISOString());
        } else {
          setPhase('ready');
          setPhaseStartedAt(null);
        }
      }
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [activeCodingStartedAt, phase, phaseStartedAt, stopCoding]);

  const handleStart = () => {
    if (phase === 'rest') return;
    setPhase('work');
    const startedAt = new Date().toISOString();
    setPhaseStartedAt(startedAt);
    startCoding();
  };

  const handleStop = () => {
    if (phase === 'work') stopCoding();
    setPhase('ready');
    setPhaseStartedAt(null);
  };

  const isActive = Boolean(activeCodingStartedAt) && phase !== 'ready';

  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1 ${isActive ? phase === 'work' ? 'border-[#10b981]/40 bg-[#10b981]/10' : 'border-[#f59e0b]/40 bg-[#f59e0b]/10' : 'border-white/[0.08] bg-white/[0.03]'}`}>
      {isActive && <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${phase === 'work' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />}
      <span className={`text-[10px] font-semibold uppercase ${phase === 'work' ? 'text-[#10b981]' : phase === 'rest' ? 'text-[#f59e0b]' : 'text-[#8a8f98]'}`}>{phase === 'work' ? 'Focus' : phase === 'rest' ? 'Rest' : 'Ready'}</span>
      <span className={`font-mono text-[11px] ${isActive ? 'text-white' : 'text-[#8a8f98]'}`}>
        {formatDuration(remainingSeconds)}
      </span>
      <button
        type="button"
        onClick={isActive ? handleStop : handleStart}
        disabled={phase === 'rest'}
        className={`text-[11px] font-semibold ${isActive ? 'text-[#f43f5e] hover:text-white' : 'text-white hover:text-[#10b981]'} disabled:cursor-not-allowed disabled:opacity-50`}
        title={isActive ? 'Stop Pomodoro' : 'Start 25-minute focus interval'}
      >
        {isActive ? 'Stop' : phase === 'rest' ? 'Rest' : 'Start'}
      </button>
    </div>
  );
};

export default CodingTimer;