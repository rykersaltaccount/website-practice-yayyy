import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../contexts/AppContext';

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainingSeconds}`;
};

const CodingTimer: React.FC = () => {
  const { activeCodingStartedAt, startCoding, stopCoding } = useContext(AppContext)!;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeCodingStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(activeCodingStartedAt).getTime()) / 1000)));
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [activeCodingStartedAt]);

  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1 ${activeCodingStartedAt ? 'border-[#10b981]/40 bg-[#10b981]/10' : 'border-white/[0.08] bg-white/[0.03]'}`}>
      {activeCodingStartedAt && <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />}
      <span className={`font-mono text-[11px] ${activeCodingStartedAt ? 'text-[#10b981]' : 'text-[#8a8f98]'}`}>
        {activeCodingStartedAt ? formatDuration(elapsedSeconds) : '00:00:00'}
      </span>
      <button
        type="button"
        onClick={activeCodingStartedAt ? stopCoding : startCoding}
        className={`text-[11px] font-semibold ${activeCodingStartedAt ? 'text-[#f43f5e] hover:text-white' : 'text-white hover:text-[#10b981]'}`}
        title={activeCodingStartedAt ? 'Stop coding session' : 'Start coding session'}
      >
        {activeCodingStartedAt ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};

export default CodingTimer;