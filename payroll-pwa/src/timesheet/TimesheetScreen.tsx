import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getEntriesForWeek } from '../db/queries';
import type { TimeEntry } from '../db/types';

export default function TimesheetScreen() {
  const { employee } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekStart, weekEnd } = getWeekRange(weekOffset);

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    getEntriesForWeek(employee.id, weekStart.toISOString(), weekEnd.toISOString())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [employee, weekOffset]);

  const totalHours = entries.reduce((sum, e) => {
    if (!e.clock_out) return sum;
    return sum + (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000;
  }, 0);

  const grouped = groupByDate(entries);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Week selector */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="text-brand px-3 py-1">
          &larr; Prev
        </button>
        <div className="text-center">
          <div className="text-sm text-slate-400">
            {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </div>
          <div className="text-lg font-bold text-white">{totalHours.toFixed(2)} hrs</div>
          {totalHours > 40 && (
            <div className="text-xs text-danger">{(totalHours - 40).toFixed(2)} OT</div>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset >= 0}
          className="text-brand px-3 py-1 disabled:text-slate-600"
        >
          Next &rarr;
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-slate-500 py-12">No entries this week</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateStr, dayEntries]) => (
            <div key={dateStr} className="bg-surface rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-white">{dateStr}</h3>
                <span className="text-sm text-slate-400">
                  {dayEntries.reduce((s, e) => s + getHours(e), 0).toFixed(2)} hrs
                </span>
              </div>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                        entry.is_shop ? 'bg-warning/20 text-warning' : 'bg-brand/20 text-brand'
                      }`}>
                        {entry.is_shop ? 'SHOP' : 'JOB'}
                      </span>
                      <span className="text-slate-300">{entry.worker_class}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-mono">{getHours(entry).toFixed(2)}h</div>
                      <div className="text-xs text-slate-500">
                        {fmtTime(entry.clock_in)} - {entry.clock_out ? fmtTime(entry.clock_out) : 'active'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + offset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

function groupByDate(entries: TimeEntry[]) {
  const groups: Record<string, TimeEntry[]> = {};
  entries.forEach((e) => {
    const d = new Date(e.clock_in).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return groups;
}

function getHours(entry: TimeEntry) {
  if (!entry.clock_out) return 0;
  return (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
