import type { CeRow } from '../db/types';

interface EntryWithDetails {
  emp_id: string;
  clock_in: string;
  clock_out: string | null;
  is_shop: boolean;
  shop_type: string | null;
  worker_class: string;
  equipment_id: string | null;
  trucking_designation: string | null;
  trucking_job_code: string | null;
  project_num?: string;
  cost_code?: string;
  cost_code_desc?: string;
  equipment_name?: string;
}

function roundHours(h: number): number {
  return Math.round(h * 100) / 100;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function buildCeRows(
  entries: EntryWithDetails[],
  otThreshold = 40,
  otMult = 1.5
): CeRow[] {
  // Group by employee
  const byEmployee: Record<string, { empId: string; entries: EntryWithDetails[] }> = {};
  entries.forEach((e) => {
    if (!e.clock_out) return; // skip active entries
    if (!byEmployee[e.emp_id]) byEmployee[e.emp_id] = { empId: e.emp_id, entries: [] };
    byEmployee[e.emp_id].entries.push(e);
  });

  const ceRows: CeRow[] = [];

  Object.keys(byEmployee).sort().forEach((empId) => {
    const emp = byEmployee[empId];
    emp.entries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

    let accumulated = 0;

    emp.entries.forEach((entry) => {
      const hours = (new Date(entry.clock_out!).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
      let job = '', phase = '', cat = '', worktype = 1, des1 = '', department = '', empClass = '';

      if (entry.is_shop) {
        des1 = '';
        // Auto-default worker class by shop type
        if (entry.shop_type === 'trucking') {
          empClass = 'DRIVER';
        } else if (entry.shop_type === 'mechanic') {
          empClass = 'MECHANIC';
        } else if (entry.shop_type === 'office') {
          empClass = 'MGMT';
        } else {
          empClass = 'LAB GEN';
        }
        department = entry.shop_type === 'office' ? 'ADMIN' : 'SHOP';

        if (entry.shop_type === 'trucking' && entry.trucking_designation === 'small') {
          job = '26-000'; phase = '03'; cat = '1010';
          worktype = 1; department = 'FIELD';
        } else if (entry.shop_type === 'trucking' && entry.trucking_designation === 'job') {
          // AJK Job trucking — job code is just the project number
          job = entry.trucking_job_code || '';
          phase = ''; cat = '';
          worktype = 1; department = 'FIELD';
        } else if (entry.shop_type === 'trucking' && entry.trucking_designation === 'other') {
          // Trucking for Others — description stored in trucking_job_code
          des1 = entry.trucking_job_code || '';
          job = ''; phase = ''; cat = '';
          worktype = 2;
        } else {
          job = ''; phase = ''; cat = '';
          worktype = 2;
        }

        if (entry.shop_type === 'mechanic' && !entry.equipment_id) {
          des1 = 'Small Engine Work';
        }
      } else {
        job = entry.project_num || '';
        const ccParts = (entry.cost_code || '').split('.');
        phase = ccParts[0] || '';
        cat = ccParts[1] || '';
        worktype = 1;
        department = 'FIELD';
        empClass = entry.equipment_id ? 'OPER A' : 'LAB GEN';
      }

      // Override class if set explicitly
      if (entry.worker_class && entry.worker_class !== 'LAB GEN') {
        empClass = entry.worker_class;
      }

      const prevAccum = accumulated;
      accumulated += hours;

      const makeCeRow = (payType: number, h: number): CeRow => ({
        emp: empId,
        type: payType,
        otmult: payType >= 2 ? String(otMult) : '1.0',
        class: empClass,
        job, phase, cat, department,
        worktype,
        unionloc: '', billat: '',
        hours: roundHours(h),
        rate: '', amount: '',
        date: formatDate(entry.clock_in),
        des1, des2: '',
        wcomp1: '', wcomp2: '', state: '', local: '',
        units: '', costtype: '', costcode: '',
        equipnum: entry.equipment_name || '',
        equipcode: '', equiporder: '', equiphours: '', equipdes: '',
        account: '',
        starttime: formatTime(entry.clock_in),
        endtime: formatTime(entry.clock_out!),
      });

      if (prevAccum >= otThreshold) {
        ceRows.push(makeCeRow(2, roundHours(hours)));
      } else if (accumulated > otThreshold) {
        const regPortion = roundHours(otThreshold - prevAccum);
        const otPortion = roundHours(hours - regPortion);
        if (regPortion > 0) ceRows.push(makeCeRow(1, regPortion));
        if (otPortion > 0) ceRows.push(makeCeRow(2, otPortion));
      } else {
        ceRows.push(makeCeRow(1, roundHours(hours)));
      }
    });
  });

  return ceRows;
}

// ── CSV Generation ──
const CE_HEADERS = [
  'emp','type','otmult','class','job','phase','cat','department','worktype',
  'unionloc','billat','hours','rate','amount','date','des1','des2',
  'wcomp1','wcomp2','state','local','units','costtype','costcode',
  'equipnum','equipcode','equiporder','equiphours','equipdes','account',
  'starttime','endtime',
] as const;

export function generateCsv(rows: CeRow[], format: 'csv' | 'tab' = 'csv'): string {
  const delim = format === 'tab' ? '\t' : ',';
  let csv = CE_HEADERS.join(delim) + '\n';

  rows.forEach((r) => {
    const row = CE_HEADERS.map((h) => {
      let val: string;
      if (h === 'hours' || h === 'equiphours') {
        val = typeof r[h] === 'number' ? r[h].toFixed(2) : String(r[h] || '');
      } else {
        const v = r[h as keyof CeRow];
        val = String(v != null ? v : '');
      }
      if (val.includes(delim) || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    csv += row.join(delim) + '\n';
  });

  return csv;
}

export function downloadCsv(rows: CeRow[], format: 'csv' | 'tab' = 'csv') {
  const csv = generateCsv(rows, format);
  const ext = format === 'tab' ? 'txt' : 'csv';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CE_Payroll_Import_${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
