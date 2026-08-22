import React, { useContext } from 'react';
import AppContext from '../contexts/AppContext';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeeklyActivity: React.FC = () => {
  const { codingSessions } = useContext(AppContext)!;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toLocaleDateString('en-CA');
    const intervals = codingSessions
      .filter(session => new Date(session.endedAt).toLocaleDateString('en-CA') === key)
      .reduce((total, session) => total + (session.deepWorkIntervals || 0), 0);
    return { label: dayNames[date.getDay()], intervals };
  });
  const maxIntervals = Math.max(4, ...days.map(day => day.intervals));
  const points = days.map((day, index) => `${index * 16.66 + 2},${104 - (day.intervals / maxIntervals) * 84}`).join(' ');
  const totalIntervals = days.reduce((total, day) => total + day.intervals, 0);

  return (
    <section className="linear-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Weekly Activity</h3>
          <p className="mt-1 text-[11px] text-[#8a8f98]">Deep Work Intervals · {totalIntervals} completed this week</p>
        </div>
        <span className="rounded border border-white/[0.08] px-2 py-1 text-[10px] text-[#8a8f98]">Last 7 days</span>
      </div>
      <div className="relative h-36">
        <div className="absolute inset-x-0 top-1/4 border-t border-white/[0.06]" />
        <div className="absolute inset-x-0 top-1/2 border-t border-white/[0.06]" />
        <div className="absolute inset-x-0 top-3/4 border-t border-white/[0.06]" />
        <svg viewBox="0 0 102 110" preserveAspectRatio="none" className="h-28 w-full overflow-visible">
          <defs><linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5e6ad2" stopOpacity=".35" /><stop offset="1" stopColor="#5e6ad2" stopOpacity="0" /></linearGradient></defs>
          <polygon points={`2,104 ${points} 102,104`} fill="url(#activity-fill)" />
          <polyline points={points} fill="none" stroke="#6f80ed" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          {days.map((day, index) => <circle key={day.label} cx={index * 16.66 + 2} cy={104 - (day.intervals / maxIntervals) * 84} r="1.5" fill="#dce1ff" stroke="#5e6ad2" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-[#62666f]">
          {days.map(day => <span key={day.label}>{day.label}</span>)}
        </div>
      </div>
    </section>
  );
};

export default WeeklyActivity;