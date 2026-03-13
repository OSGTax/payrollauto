import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getAllEntriesForDateRange, updateEntryStatus, batchUpdateStatus, updateEntryTimes } from '../db/queries';
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
  admin_notes: string | null;
  project_id: string | null;
  cost_code_id: string | null;
  equipment_id: string | null;
  trucking_designation: string | null;
  trucking_job_code: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  employees: { emp_id: string; full_name: string };
  projects: { project_num: string; name: string } | null;
  cost_codes: { code: string; description: string } | null;
  equipment: { name: string; description: string } | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'flagged';

export default function AdminDashboard() {
  const { employee } = useAuth();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'review' | 'export'>('review');
  const [ceRows, setCeRows] = useState<CeRow[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Batch selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Expanded entry for detail/edit
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');

  // Flag notes modal
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagNotes, setFlagNotes] = useState('');

  // Date range (default to this week)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { loadEntries(); }, [startDate, endDate]);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await getAllEntriesForDateRange(
        new Date(startDate).toISOString(),
        new Date(endDate + 'T23:59:59').toISOString()
      );
      setEntries(data as EntryRow[]);
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }

  // Counts
  const counts = { pending: 0, approved: 0, flagged: 0 };
  entries.forEach((e) => { if (e.status in counts) counts[e.status as keyof typeof counts]++; });

  // Filtered entries
  const filtered = entries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (employeeFilter && e.employees.emp_id !== employeeFilter) return false;
    return true;
  });

  // Unique employees for filter
  const uniqueEmployees = [...new Map(entries.map((e) => [e.employees.emp_id, e.employees])).values()]
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  async function handleStatusChange(entryId: string, status: 'approved' | 'flagged', notes?: string) {
    if (!employee) return;
    try {
      await updateEntryStatus(entryId, status, employee.id, notes);
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, status, admin_notes: notes || e.admin_notes } : e));
    } catch {
      alert('Failed to update status');
    }
  }

  async function handleBatchAction(status: 'approved' | 'flagged', notes?: string) {
    if (!employee || selected.size === 0) return;
    try {
      await batchUpdateStatus([...selected], status, employee.id, notes);
      setEntries((prev) => prev.map((e) =>
        selected.has(e.id) ? { ...e, status, admin_notes: notes || e.admin_notes } : e
      ));
      setSelected(new Set());
    } catch {
      alert('Failed to batch update');
    }
  }

  async function handleSaveTimes(entryId: string) {
    if (!employee) return;
    try {
      await updateEntryTimes(entryId, editClockIn, editClockOut || null, employee.id);
      setEntries((prev) => prev.map((e) =>
        e.id === entryId ? { ...e, clock_in: editClockIn, clock_out: editClockOut || null } : e
      ));
      setExpandedId(null);
    } catch {
      alert('Failed to update times');
    }
  }

  function handleFlag(entryId: string) {
    setFlaggingId(entryId);
    setFlagNotes('');
  }

  function confirmFlag() {
    if (!flaggingId || !flagNotes.trim()) return;
    handleStatusChange(flaggingId, 'flagged', flagNotes.trim());
    setFlaggingId(null);
    setFlagNotes('');
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  }

  function expandEntry(entry: EntryRow) {
    if (expandedId === entry.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(entry.id);
    setEditClockIn(entry.clock_in.slice(0, 16)); // datetime-local format
    setEditClockOut(entry.clock_out ? entry.clock_out.slice(0, 16) : '');
  }

  function handleExport() {
    const approved = entries.filter((e) => e.clock_out && e.status === 'approved');
    const enriched = approved.map((e) => ({
      emp_id: e.employees.emp_id,
      clock_in: e.clock_in,
      clock_out: e.clock_out,
      is_shop: e.is_shop,
      shop_type: e.shop_type,
      worker_class: e.worker_class,
      equipment_id: e.equipment_id,
      trucking_designation: e.trucking_designation,
      trucking_job_code: e.trucking_job_code,
      project_num: e.projects?.project_num,
      cost_code: e.cost_codes?.code,
      cost_code_desc: e.cost_codes?.description,
      equipment_name: e.equipment?.name,
    }));
    const rows = buildCeRows(enriched);
    setCeRows(rows);
    setTab('export');
  }

  if (employee?.role !== 'admin') {
    return <div className="p-4 text-center text-slate-500 py-12">Admin access required</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Date range */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700" />
        <span className="text-slate-500">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700" />
        <button onClick={loadEntries} className="bg-brand text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
      </div>

      {/* Summary counts */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300">
          Total: {entries.length}
        </span>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-warning/20 text-warning">
          Pending: {counts.pending}
        </span>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-success/20 text-success">
          Approved: {counts.approved}
        </span>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-danger/20 text-danger">
          Flagged: {counts.flagged}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('review')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'review' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'}`}>
          Review Entries
        </button>
        <button onClick={handleExport}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'export' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'}`}>
          CE Export
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : tab === 'review' ? (
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <span className="text-xs text-slate-500">Status:</span>
            {(['all', 'pending', 'approved', 'flagged'] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg ${statusFilter === s ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}
              className="bg-slate-800 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-xs ml-2">
              <option value="">All Employees</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          {/* Batch actions */}
          {selected.size > 0 && (
            <div className="flex gap-2 mb-3 items-center bg-slate-800 rounded-lg p-3">
              <span className="text-sm text-slate-300">{selected.size} selected</span>
              <button onClick={() => handleBatchAction('approved')}
                className="bg-success text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                Approve Selected
              </button>
              <button onClick={() => {
                const notes = prompt('Reason for flagging:');
                if (notes) handleBatchAction('flagged', notes);
              }}
                className="bg-danger text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                Flag Selected
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-slate-400 hover:text-white ml-auto">
                Clear
              </button>
            </div>
          )}

          {/* Entries list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No entries found</div>
            ) : (
              <>
                {/* Select all */}
                <div className="flex items-center gap-2 px-2">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                  <span className="text-xs text-slate-500">Select all ({filtered.length})</span>
                </div>

                {filtered.map((entry) => (
                  <div key={entry.id} className="bg-surface rounded-xl overflow-hidden">
                    {/* Main row */}
                    <div className="p-4 flex items-center gap-3">
                      <input type="checkbox" checked={selected.has(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 flex-shrink-0" />

                      <button onClick={() => expandEntry(entry)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-white">{entry.employees.full_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            entry.is_shop ? 'bg-warning/20 text-warning' : 'bg-brand/20 text-brand'
                          }`}>
                            {entry.is_shop ? entry.shop_type || 'SHOP' : 'JOB'}
                          </span>
                          <span className="text-xs text-slate-500">{entry.worker_class}</span>
                          {entry.projects && (
                            <span className="text-xs font-mono text-slate-400">{entry.projects.project_num}</span>
                          )}
                          {entry.cost_codes && (
                            <span className="text-xs font-mono text-slate-400">{entry.cost_codes.code}</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(entry.clock_in).toLocaleDateString()}{' '}
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          {entry.clock_out && (
                            <> - {new Date(entry.clock_out).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            {' '}({((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000).toFixed(2)}h)</>
                          )}
                        </div>
                        {entry.notes && <div className="text-xs text-slate-500 mt-1">{entry.notes}</div>}
                        {entry.admin_notes && (
                          <div className="text-xs text-danger mt-1">Admin: {entry.admin_notes}</div>
                        )}
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${
                          entry.status === 'approved' ? 'bg-success/20 text-success' :
                          entry.status === 'flagged' ? 'bg-danger/20 text-danger' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {entry.status}
                        </span>
                        {(entry.status === 'pending' || entry.status === 'flagged') && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(entry.id, 'approved'); }}
                            className="text-success text-sm hover:underline">
                            Approve
                          </button>
                        )}
                        {entry.status !== 'flagged' && (
                          <button onClick={(e) => { e.stopPropagation(); handleFlag(entry.id); }}
                            className="text-danger text-sm hover:underline">
                            Flag
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedId === entry.id && (
                      <div className="border-t border-slate-800 p-4 bg-slate-900/50">
                        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                          <div>
                            <span className="text-slate-500">Project:</span>{' '}
                            <span className="text-slate-300">{entry.projects ? `${entry.projects.project_num} - ${entry.projects.name}` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Cost Code:</span>{' '}
                            <span className="text-slate-300">{entry.cost_codes ? `${entry.cost_codes.code} - ${entry.cost_codes.description}` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Equipment:</span>{' '}
                            <span className="text-slate-300">{entry.equipment ? `${entry.equipment.name} - ${entry.equipment.description}` : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Trucking:</span>{' '}
                            <span className="text-slate-300">{entry.trucking_designation || 'N/A'}{entry.trucking_job_code ? ` (${entry.trucking_job_code})` : ''}</span>
                          </div>
                          {entry.clock_in_lat && (
                            <div>
                              <span className="text-slate-500">GPS:</span>{' '}
                              <span className="text-slate-300">{entry.clock_in_lat.toFixed(4)}, {entry.clock_in_lng?.toFixed(4)}</span>
                            </div>
                          )}
                        </div>

                        {/* Edit times */}
                        <div className="flex gap-3 items-end flex-wrap">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Clock In</label>
                            <input type="datetime-local" value={editClockIn}
                              onChange={(e) => setEditClockIn(e.target.value)}
                              className="bg-slate-800 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Clock Out</label>
                            <input type="datetime-local" value={editClockOut}
                              onChange={(e) => setEditClockOut(e.target.value)}
                              className="bg-slate-800 text-white rounded-lg px-3 py-1.5 border border-slate-700 text-sm" />
                          </div>
                          <button onClick={() => handleSaveTimes(entry.id)}
                            className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                            Save Times
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        /* CE Export Tab */
        <div>
          <div className="flex gap-2 mb-2 items-center">
            <button onClick={() => downloadCsv(ceRows, 'csv')}
              className="bg-success text-white px-4 py-2 rounded-lg text-sm font-medium">
              Download CSV
            </button>
            <button onClick={() => downloadCsv(ceRows, 'tab')}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Download Tab-Delimited
            </button>
            <span className="text-xs text-slate-500 ml-2">{ceRows.length} rows (approved entries only)</span>
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

      {/* Flag notes modal */}
      {flaggingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-white mb-3">Flag Entry</h3>
            <p className="text-sm text-slate-400 mb-3">Please provide a reason for flagging this entry:</p>
            <textarea
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700 text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setFlaggingId(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">
                Cancel
              </button>
              <button onClick={confirmFlag} disabled={!flagNotes.trim()}
                className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                Flag Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
