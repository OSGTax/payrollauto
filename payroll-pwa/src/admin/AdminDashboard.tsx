import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getAllEntriesForDateRange, updateEntryStatus } from '../db/queries';
import { buildCeRows, downloadCsv } from '../export/ceExport';
import type { CeRow } from '../db/types';

interface EntryRow {
  id: string;
  clock_in: string;
  clock_out: string | null;
  is_shop: boolean;
  shop_type: string | null;
  worker_class: string;
  status: string;
  notes: string | null;
  employees: { emp_id: string; full_name: string };
}

export default function AdminDashboard() {
  const { employee } = useAuth();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'review' | 'export'>('review');
  const [ceRows, setCeRows] = useState<CeRow[]>([]);

  // Date range (default to this week)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadEntries();
  }, [startDate, endDate]);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await getAllEntriesForDateRange(
        new Date(startDate).toISOString(),
        new Date(endDate + 'T23:59:59').toISOString()
      );
      setEntries(data as EntryRow[]);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(entryId: string, status: 'approved' | 'flagged') {
    if (!employee) return;
    try {
      await updateEntryStatus(entryId, status, employee.id);
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status } : e));
    } catch (err) {
      alert('Failed to update status');
    }
  }

  function handleExport() {
    // Build CE rows from entries (simplified — in production, join with projects/cost_codes)
    const enriched = entries
      .filter((e) => e.clock_out)
      .map((e) => ({
        ...e,
        emp_id: e.employees.emp_id,
        employee_id: '',
        project_id: null,
        cost_code_id: null,
        clock_in_lat: null,
        clock_in_lng: null,
        clock_in_accuracy: null,
        equipment_id: null,
        trucking_designation: null as 'shop' | 'small' | 'job' | null,
        trucking_job_code: null,
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        local_id: '',
        created_at: '',
        updated_at: '',
      }));
    const rows = buildCeRows(enriched);
    setCeRows(rows);
    setTab('export');
  }

  if (employee?.role !== 'admin') {
    return (
      <div className="p-4 text-center text-slate-500 py-12">
        Admin access required
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Date range */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700"
        />
        <span className="text-slate-500">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700"
        />
        <button onClick={loadEntries} className="bg-brand text-white px-4 py-2 rounded-lg text-sm">
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('review')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'review' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Review Entries ({entries.length})
        </button>
        <button
          onClick={handleExport}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'export' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          CE Export
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : tab === 'review' ? (
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No entries found</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-surface rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{entry.employees.full_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      entry.is_shop ? 'bg-warning/20 text-warning' : 'bg-brand/20 text-brand'
                    }`}>
                      {entry.is_shop ? entry.shop_type || 'SHOP' : 'JOB'}
                    </span>
                    <span className="text-xs text-slate-500">{entry.worker_class}</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(entry.clock_in).toLocaleDateString()} {' '}
                    {new Date(entry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {entry.clock_out && (
                      <> - {new Date(entry.clock_out).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {' '}({((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000).toFixed(2)}h)</>
                    )}
                  </div>
                  {entry.notes && <div className="text-xs text-slate-500 mt-1">{entry.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    entry.status === 'approved' ? 'bg-success/20 text-success' :
                    entry.status === 'flagged' ? 'bg-danger/20 text-danger' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {entry.status}
                  </span>
                  {entry.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(entry.id, 'approved')}
                        className="text-success text-sm hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(entry.id, 'flagged')}
                        className="text-danger text-sm hover:underline"
                      >
                        Flag
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* CE Export Tab */
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => downloadCsv(ceRows, 'csv')}
              className="bg-success text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Download CSV
            </button>
            <button
              onClick={() => downloadCsv(ceRows, 'tab')}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Download Tab-Delimited
            </button>
          </div>
          <div className="overflow-x-auto bg-surface rounded-xl">
            <table className="text-xs text-left w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-2 py-2 text-slate-400">Emp</th>
                  <th className="px-2 py-2 text-slate-400">Date</th>
                  <th className="px-2 py-2 text-slate-400">Type</th>
                  <th className="px-2 py-2 text-slate-400">Class</th>
                  <th className="px-2 py-2 text-slate-400">Dept</th>
                  <th className="px-2 py-2 text-slate-400">Job</th>
                  <th className="px-2 py-2 text-slate-400">Phase.Cat</th>
                  <th className="px-2 py-2 text-slate-400">Hours</th>
                  <th className="px-2 py-2 text-slate-400">Start</th>
                  <th className="px-2 py-2 text-slate-400">End</th>
                </tr>
              </thead>
              <tbody>
                {ceRows.map((r, i) => (
                  <tr key={i} className={`border-b border-slate-800 ${
                    r.department === 'SHOP' ? 'bg-warning/5' : r.department === 'ADMIN' ? 'bg-brand/5' : ''
                  }`}>
                    <td className="px-2 py-1.5 font-mono text-white">{r.emp}</td>
                    <td className="px-2 py-1.5 text-slate-300">{r.date}</td>
                    <td className="px-2 py-1.5">
                      <span className={r.type === 2 ? 'text-danger' : 'text-success'}>
                        {r.type === 2 ? 'OT' : 'REG'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-300">{r.class}</td>
                    <td className="px-2 py-1.5 text-slate-300">{r.department}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-300">{r.job}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-300">{r.phase}{r.cat ? '.' + r.cat : ''}</td>
                    <td className="px-2 py-1.5 font-mono text-white text-right">{r.hours.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-slate-400">{r.starttime}</td>
                    <td className="px-2 py-1.5 text-slate-400">{r.endtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
