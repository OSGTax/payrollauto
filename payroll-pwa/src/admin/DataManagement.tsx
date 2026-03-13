import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../db/supabase';
import type { Employee, Project, CostCode, Equipment } from '../db/types';

type Tab = 'employees' | 'costcodes' | 'equipment' | 'projects';

interface CsvPreview {
  headers: string[];
  rows: string[][];
}

function parseCsv(text: string): CsvPreview {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const parse = (line: string) =>
    line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) };
}

export default function DataManagement() {
  const { employee } = useAuth();
  const [tab, setTab] = useState<Tab>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [empRes, projRes, ccRes, eqRes] = await Promise.all([
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('projects').select('*').order('project_num'),
      supabase.from('cost_codes').select('*').order('code'),
      supabase.from('equipment').select('*').order('name'),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (projRes.data) setProjects(projRes.data);
    if (ccRes.data) setCostCodes(ccRes.data);
    if (eqRes.data) setEquipment(eqRes.data);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setPreview(parseCsv(text));
      setMessage('');
    };
    reader.readAsText(file);
  }

  async function handleImportEmployees() {
    if (!preview) return;
    setImporting(true);
    setMessage('');
    let created = 0;
    let errors: string[] = [];

    for (const row of preview.rows) {
      const [empId, fullName, role, defaultClass] = row;
      if (!empId || !fullName) { errors.push(`Skipped empty row`); continue; }

      const cleanEmpId = empId.toUpperCase().trim();
      const cleanRole = (role || 'field').toLowerCase().trim();
      const cleanClass = (defaultClass || 'LAB GEN').toUpperCase().trim();

      // Create auth user (ignore if exists)
      const email = `${cleanEmpId.toLowerCase()}@crew.local`;
      await supabase.auth.signUp({ email, password: '1234' });

      // Upsert employee record
      const { error } = await supabase.from('employees').upsert(
        { emp_id: cleanEmpId, full_name: fullName.trim(), role: cleanRole, default_class: cleanClass, is_active: true },
        { onConflict: 'emp_id' }
      );
      if (error) { errors.push(`${cleanEmpId}: ${error.message}`); }
      else { created++; }
    }

    setMessage(`Imported ${created} employees.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
    setPreview(null);
    setImporting(false);
    loadAll();
  }

  async function handleImportProjects() {
    if (!preview) return;
    setImporting(true);
    setMessage('');
    let created = 0;
    let errors: string[] = [];

    for (const row of preview.rows) {
      const [projectNum, name] = row;
      if (!projectNum || !name) { errors.push(`Skipped empty row`); continue; }

      const { error } = await supabase.from('projects').upsert(
        { project_num: projectNum.trim(), name: name.trim(), is_active: true },
        { onConflict: 'project_num' }
      );
      if (error) { errors.push(`${projectNum}: ${error.message}`); }
      else { created++; }
    }

    setMessage(`Imported ${created} projects.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
    setPreview(null);
    setImporting(false);
    loadAll();
  }

  async function handleImportCostCodes() {
    if (!preview) return;
    setImporting(true);
    setMessage('');
    let created = 0;
    let errors: string[] = [];

    for (const row of preview.rows) {
      const [code, description] = row;
      if (!code) { errors.push(`Skipped empty row`); continue; }

      const { error } = await supabase.from('cost_codes').upsert(
        { code: code.trim(), description: (description || '').trim(), is_active: true },
        { onConflict: 'code' }
      );
      if (error) { errors.push(`${code}: ${error.message}`); }
      else { created++; }
    }

    setMessage(`Imported ${created} cost codes.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
    setPreview(null);
    setImporting(false);
    loadAll();
  }

  async function handleImportEquipment() {
    if (!preview) return;
    setImporting(true);
    setMessage('');
    let created = 0;
    let errors: string[] = [];

    for (const row of preview.rows) {
      const [name, description] = row;
      if (!name) { errors.push(`Skipped empty row`); continue; }

      // Equipment doesn't have a unique name constraint, so check first
      const { data: existing } = await supabase.from('equipment').select('id').eq('name', name.trim()).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('equipment').update(
          { description: (description || '').trim(), is_active: true }
        ).eq('id', existing.id);
        if (error) { errors.push(`${name}: ${error.message}`); }
        else { created++; }
      } else {
        const { error } = await supabase.from('equipment').insert(
          { name: name.trim(), description: (description || '').trim() }
        );
        if (error) { errors.push(`${name}: ${error.message}`); }
        else { created++; }
      }
    }

    setMessage(`Imported ${created} equipment items.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
    setPreview(null);
    setImporting(false);
    loadAll();
  }

  async function toggleActive(table: string, id: string, currentActive: boolean) {
    await supabase.from(table).update({ is_active: !currentActive }).eq('id', id);
    loadAll();
  }

  function handleImport() {
    if (tab === 'employees') handleImportEmployees();
    else if (tab === 'projects') handleImportProjects();
    else if (tab === 'costcodes') handleImportCostCodes();
    else if (tab === 'equipment') handleImportEquipment();
  }

  const csvFormats: Record<Tab, string> = {
    employees: 'emp_id, full_name, role, default_class',
    projects: 'project_num, name',
    costcodes: 'code, description',
    equipment: 'name, description',
  };

  if (employee?.role !== 'admin') {
    return <div className="p-4 text-center text-slate-500 py-12">Admin access required</div>;
  }

  const currentData = tab === 'employees' ? employees
    : tab === 'projects' ? projects
    : tab === 'costcodes' ? costCodes
    : equipment;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Data Management</h2>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          ['employees', 'Employees'],
          ['projects', 'Projects'],
          ['costcodes', 'Cost Codes'],
          ['equipment', 'Equipment'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPreview(null); setMessage(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === key ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CSV Upload */}
      <div className="bg-surface rounded-xl p-4 mb-4">
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Import CSV — Format: <code className="text-brand">{csvFormats[tab]}</code>
        </h3>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand file:text-white hover:file:bg-brand/80"
        />

        {preview && preview.rows.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-2">{preview.rows.length} rows to import:</div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="text-xs text-left w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    {preview.headers.map((h, i) => (
                      <th key={i} className="px-2 py-1.5 text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 text-slate-300">{cell}</td>
                      ))}
                    </tr>
                  ))}
                  {preview.rows.length > 20 && (
                    <tr><td colSpan={preview.headers.length} className="text-center text-slate-500 py-2">
                      ...and {preview.rows.length - 20} more
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="mt-3 bg-success text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.rows.length} Records`}
            </button>
          </div>
        )}

        {message && (
          <div className={`mt-3 text-sm p-3 rounded-lg ${
            message.includes('Error') ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Existing records */}
      <div className="bg-surface rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          Existing Records ({currentData.length})
        </h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="text-xs text-left w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {tab === 'employees' && (
                  <><th className="px-2 py-1.5 text-slate-400">Emp ID</th>
                  <th className="px-2 py-1.5 text-slate-400">Name</th>
                  <th className="px-2 py-1.5 text-slate-400">Role</th>
                  <th className="px-2 py-1.5 text-slate-400">Class</th></>
                )}
                {tab === 'projects' && (
                  <><th className="px-2 py-1.5 text-slate-400">Project #</th>
                  <th className="px-2 py-1.5 text-slate-400">Name</th></>
                )}
                {tab === 'costcodes' && (
                  <><th className="px-2 py-1.5 text-slate-400">Code</th>
                  <th className="px-2 py-1.5 text-slate-400">Description</th></>
                )}
                {tab === 'equipment' && (
                  <><th className="px-2 py-1.5 text-slate-400">Name</th>
                  <th className="px-2 py-1.5 text-slate-400">Description</th></>
                )}
                <th className="px-2 py-1.5 text-slate-400">Status</th>
                <th className="px-2 py-1.5 text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item: any) => (
                <tr key={item.id} className={`border-b border-slate-800 ${!item.is_active ? 'opacity-50' : ''}`}>
                  {tab === 'employees' && (
                    <><td className="px-2 py-1.5 font-mono text-white">{item.emp_id}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.full_name}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.role}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.default_class}</td></>
                  )}
                  {tab === 'projects' && (
                    <><td className="px-2 py-1.5 font-mono text-white">{item.project_num}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.name}</td></>
                  )}
                  {tab === 'costcodes' && (
                    <><td className="px-2 py-1.5 font-mono text-white">{item.code}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.description}</td></>
                  )}
                  {tab === 'equipment' && (
                    <><td className="px-2 py-1.5 font-mono text-white">{item.name}</td>
                    <td className="px-2 py-1.5 text-slate-300">{item.description}</td></>
                  )}
                  <td className="px-2 py-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.is_active ? 'bg-success/20 text-success' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => toggleActive(
                        tab === 'costcodes' ? 'cost_codes' : tab,
                        item.id,
                        item.is_active
                      )}
                      className={`text-xs hover:underline ${
                        item.is_active ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
