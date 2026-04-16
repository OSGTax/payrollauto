/**
 * ComputerEase payroll import serializer.
 * Matches payroll+import+layout (2).xls — columns and widths verified against
 * the spec sheet and the BILL sample row.
 *
 * Supported formats: comma-delimited (default), tab-delimited, or fixed-width.
 * Header row is emitted first — ComputerEase's import wizard has a "skip first row" toggle.
 */

import type { TimeEntry } from './types';

export type Delimiter = 'comma' | 'tab' | 'fixed';

type ColSpec = {
  name: string;
  width: number;        // character width for fixed-width mode
  decimals: number;     // for numeric fields
  kind: 'string' | 'numeric' | 'date' | 'time';
};

/**
 * Column order matches the xls. `width` / `decimals` come from the "Size" column.
 * E.g. "3.2" = 3 digits before decimal, 2 after = total 6 chars in fixed-width.
 */
export const COLUMNS: ColSpec[] = [
  { name: 'emp',        width: 8,  decimals: 0, kind: 'string'  },
  { name: 'type',       width: 1,  decimals: 0, kind: 'numeric' },
  { name: 'otmult',     width: 3,  decimals: 2, kind: 'numeric' }, // 1.2 means 1 + 2 decimals
  { name: 'class',      width: 8,  decimals: 0, kind: 'string'  },
  { name: 'job',        width: 10, decimals: 0, kind: 'string'  },
  { name: 'phase',      width: 4,  decimals: 0, kind: 'string'  },
  { name: 'cat',        width: 6,  decimals: 0, kind: 'string'  },
  { name: 'department', width: 8,  decimals: 0, kind: 'string'  },
  { name: 'worktype',   width: 1,  decimals: 0, kind: 'numeric' },
  { name: 'unionloc',   width: 8,  decimals: 0, kind: 'string'  },
  { name: 'billat',     width: 5,  decimals: 2, kind: 'numeric' }, // 3.2
  { name: 'hours',      width: 5,  decimals: 2, kind: 'numeric' }, // 3.2
  { name: 'rate',       width: 8,  decimals: 5, kind: 'numeric' }, // 3.5
  { name: 'amount',     width: 8,  decimals: 2, kind: 'numeric' }, // 6.2
  { name: 'date',       width: 8,  decimals: 0, kind: 'date'    }, // mm/dd/yy
  { name: 'des1',       width: 30, decimals: 0, kind: 'string'  },
  { name: 'des2',       width: 30, decimals: 0, kind: 'string'  },
  { name: 'wcomp1',     width: 8,  decimals: 0, kind: 'string'  },
  { name: 'wcomp2',     width: 8,  decimals: 0, kind: 'string'  },
  { name: 'state',      width: 2,  decimals: 0, kind: 'string'  },
  { name: 'local',      width: 8,  decimals: 0, kind: 'string'  },
  { name: 'units',      width: 6,  decimals: 2, kind: 'numeric' }, // 4.2
  { name: 'costtype',   width: 2,  decimals: 0, kind: 'numeric' },
  { name: 'costcode',   width: 22, decimals: 0, kind: 'string'  }, // 10.4.6 combined (job.phase.cat) up to 20 + 2 dots
  { name: 'equipnum',   width: 8,  decimals: 0, kind: 'string'  },
  { name: 'equipcode',  width: 8,  decimals: 0, kind: 'string'  },
  { name: 'equiporder', width: 10, decimals: 0, kind: 'string'  },
  { name: 'equiphours', width: 6,  decimals: 2, kind: 'numeric' },
  { name: 'equipdes',   width: 30, decimals: 0, kind: 'string'  },
  { name: 'account',    width: 12, decimals: 0, kind: 'numeric' },
  { name: 'starttime',  width: 5,  decimals: 0, kind: 'time'    }, // hhmm
  { name: 'endtime',    width: 5,  decimals: 0, kind: 'time'    },
];

export type CERow = Partial<Record<(typeof COLUMNS)[number]['name'], string | number | null>>;

/** Build a CE row from an enriched TimeEntry + employee emp_code. */
export function rowFromEntry(e: TimeEntry, empCode: string): CERow {
  const costcode = [e.job, e.phase, e.cat].filter(Boolean).join('.');
  const notes = e.notes ?? '';
  return {
    emp: empCode,
    type: e.type,
    otmult: e.otmult ?? '',
    class: e.class ?? '',
    job: e.job ?? '',
    phase: e.phase ?? '',
    cat: e.cat ?? '',
    department: e.department ?? '',
    worktype: e.worktype ?? '',
    hours: e.hours,
    rate: e.rate ?? '',
    date: formatCeDate(e.date),
    des1: notes.slice(0, 30),
    des2: notes.slice(30, 60),
    wcomp1: e.wcomp1 ?? '',
    wcomp2: e.wcomp2 ?? '',
    costcode,
    starttime: formatCeTime(e.start_time),
    endtime: formatCeTime(e.end_time),
  };
}

/** ISO date (yyyy-mm-dd) -> mm/dd/yy for CE. */
export function formatCeDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

/** 'HH:MM:SS' -> 'hhmm'. */
export function formatCeTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${h}${m}`;
}

function formatValue(col: ColSpec, v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  if (col.kind === 'numeric') {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return '';
    return col.decimals > 0 ? n.toFixed(col.decimals) : String(Math.trunc(n));
  }
  return String(v);
}

function escapeCsv(s: string, delim: string): string {
  if (s.includes(delim) || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function padFixed(col: ColSpec, s: string): string {
  const total = col.kind === 'numeric' && col.decimals > 0
    ? col.width + 1 + col.decimals  // width.decimals notation includes the dot
    : col.width;
  if (s.length >= total) return s.slice(0, total);
  // Numeric = right-align, string/date/time = left-align
  return col.kind === 'numeric' ? s.padStart(total, ' ') : s.padEnd(total, ' ');
}

export function serialize(rows: CERow[], format: Delimiter = 'comma'): string {
  const header = COLUMNS.map((c) => c.name);
  const lines: string[] = [];

  if (format === 'fixed') {
    lines.push(COLUMNS.map((c) => padFixed(c, c.name)).join(''));
    for (const r of rows) {
      lines.push(COLUMNS.map((c) => padFixed(c, formatValue(c, r[c.name] as never))).join(''));
    }
    return lines.join('\r\n') + '\r\n';
  }

  const delim = format === 'tab' ? '\t' : ',';
  lines.push(header.map((h) => escapeCsv(h, delim)).join(delim));
  for (const r of rows) {
    lines.push(
      COLUMNS.map((c) => escapeCsv(formatValue(c, r[c.name] as never), delim)).join(delim),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
