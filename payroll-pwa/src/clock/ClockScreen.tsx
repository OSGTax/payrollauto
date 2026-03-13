import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { clockIn, clockOut, getActiveEntry, getProjects, getCostCodes, getEquipment, uploadPhoto } from '../db/queries';
import { captureGps } from './GpsCapture';
import { WORKER_CLASSES } from '../db/types';
import type { Project, CostCode, Equipment, TimeEntry } from '../db/types';

type ShopType = 'mechanic' | 'trucking_ajk' | 'trucking_others' | 'misc_shop' | 'office' | null;

// Auto-default worker class based on shop type
function shopWorkerClass(shopType: ShopType): string {
  switch (shopType) {
    case 'trucking_ajk':
    case 'trucking_others':
      return 'DRIVER';
    case 'mechanic':
      return 'MECHANIC';
    case 'office':
      return 'MGMT';
    case 'misc_shop':
    default:
      return 'LAB GEN';
  }
}

export default function ClockScreen() {
  const { employee } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [elapsed, setElapsed] = useState('');

  // Form state
  const [isShop, setIsShop] = useState(false);
  const [shopType, setShopType] = useState<ShopType>(null);
  const [projectId, setProjectId] = useState('');
  const [costCodeId, setCostCodeId] = useState('');
  const [workerClass, setWorkerClass] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [truckingJobId, setTruckingJobId] = useState('');
  const [truckingOtherDesc, setTruckingOtherDesc] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Reference data
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);

  useEffect(() => {
    if (!employee) return;
    setWorkerClass(employee.default_class || 'LAB GEN');
    loadData();
  }, [employee]);

  // Elapsed time ticker
  useEffect(() => {
    if (!activeEntry) { setElapsed(''); return; }
    const tick = () => {
      const diff = Date.now() - new Date(activeEntry.clock_in).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  async function loadData() {
    try {
      const [entry, projs, codes, equip] = await Promise.all([
        getActiveEntry(employee!.id),
        getProjects(),
        getCostCodes(),
        getEquipment(),
      ]);
      setActiveEntry(entry);
      setProjects(projs);
      setCostCodes(codes);
      setEquipmentList(equip);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockIn() {
    if (!employee) return;
    setClocking(true);
    try {
      let gps = { lat: 0, lng: 0, accuracy: 0 };
      try { gps = await captureGps(); } catch { /* GPS optional */ }

      // Map UI shop type to DB values
      const isTrucking = shopType === 'trucking_ajk' || shopType === 'trucking_others';
      const dbShopType = isTrucking ? 'trucking' : shopType;
      const finalWorkerClass = isShop ? shopWorkerClass(shopType) : workerClass;

      // Trucking for AJK Job → designation 'job', job code from selected project
      // Trucking for Others → designation 'other', description in trucking_job_code
      let truckingDesignation: string | null = null;
      let truckingJobCode: string | null = null;
      if (shopType === 'trucking_ajk' && truckingJobId) {
        truckingDesignation = 'job';
        const proj = projects.find((p) => p.id === truckingJobId);
        truckingJobCode = proj?.project_num || null;
      } else if (shopType === 'trucking_others') {
        truckingDesignation = 'other';
        truckingJobCode = truckingOtherDesc || null;
      }

      const entry = await clockIn({
        employee_id: employee.id,
        clock_in: new Date().toISOString(),
        project_id: isShop ? null : (projectId || null),
        cost_code_id: isShop ? null : (costCodeId || null),
        is_shop: isShop,
        shop_type: isShop ? dbShopType : null,
        worker_class: finalWorkerClass,
        clock_in_lat: gps.lat || null,
        clock_in_lng: gps.lng || null,
        clock_in_accuracy: gps.accuracy || null,
        equipment_id: shopType === 'mechanic' ? (equipmentId || null) : null,
        notes: notes || null,
        trucking_designation: truckingDesignation,
        trucking_job_code: truckingJobCode,
        local_id: crypto.randomUUID(),
      });

      if (photoFile && entry.id) {
        await uploadPhoto(entry.id, photoFile);
      }

      setActiveEntry(entry);
      resetForm();
    } catch (err) {
      alert(`Clock in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClocking(false);
    }
  }

  async function handleClockOut() {
    if (!activeEntry) return;
    setClocking(true);
    try {
      const updated = await clockOut(activeEntry.id);
      setActiveEntry(null);
      // Show brief confirmation
      alert(`Clocked out. Total: ${formatHours(updated.clock_in, updated.clock_out!)}`);
    } catch (err) {
      alert(`Clock out failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClocking(false);
    }
  }

  function resetForm() {
    setIsShop(false);
    setShopType(null);
    setProjectId('');
    setCostCodeId('');
    setEquipmentId('');
    setTruckingJobId('');
    setTruckingOtherDesc('');
    setNotes('');
    setPhotoFile(null);
  }

  function formatHours(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hrs = (diff / 3600000).toFixed(2);
    return `${hrs} hrs`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // ── CLOCKED IN VIEW ──
  if (activeEntry) {
    return (
      <div className="p-4 flex flex-col items-center gap-6 pt-12">
        <div className="text-center">
          <div className="text-sm text-success font-medium mb-1">Currently Clocked In</div>
          <div className="text-5xl font-mono text-white font-bold">{elapsed}</div>
          <div className="text-sm text-slate-400 mt-2">
            Since {new Date(activeEntry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {activeEntry.is_shop ? `Shop - ${activeEntry.shop_type || 'General'}` : 'Job'}
            {' | '}{activeEntry.worker_class}
          </div>
        </div>

        <button
          onClick={handleClockOut}
          disabled={clocking}
          className="w-48 h-48 rounded-full bg-danger/20 border-4 border-danger text-danger text-2xl font-bold hover:bg-danger/30 transition-colors disabled:opacity-50 active:scale-95"
        >
          {clocking ? 'Clocking Out...' : 'CLOCK OUT'}
        </button>
      </div>
    );
  }

  // ── CLOCK IN VIEW ──
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      {/* Work Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setIsShop(false); setShopType(null); }}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            !isShop ? 'bg-brand text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Job
        </button>
        <button
          onClick={() => setIsShop(true)}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            isShop ? 'bg-warning text-black' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Shop
        </button>
      </div>

      {/* Job fields */}
      {!isShop && (
        <>
          <Select
            label="Project"
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ value: p.id, label: `${p.project_num} - ${p.name}` }))}
            placeholder="Select a project"
          />
          <Select
            label="Cost Code"
            value={costCodeId}
            onChange={setCostCodeId}
            options={costCodes.map((c) => ({ value: c.id, label: `${c.code} - ${c.description}` }))}
            placeholder="Select cost code"
          />
        </>
      )}

      {/* Shop fields */}
      {isShop && (
        <Select
          label="Shop Type"
          value={shopType || ''}
          onChange={(v) => setShopType(v as ShopType)}
          options={[
            { value: 'mechanic', label: 'Mechanic' },
            { value: 'trucking_ajk', label: 'Trucking for AJK Job' },
            { value: 'trucking_others', label: 'Trucking for Others' },
            { value: 'misc_shop', label: 'Miscellaneous Shop' },
            { value: 'office', label: 'Office / Admin' },
          ]}
          placeholder="Select shop type"
        />
      )}

      {/* Equipment (mechanic only) */}
      {isShop && shopType === 'mechanic' && (
        <Select
          label="Vehicle / Equipment"
          value={equipmentId}
          onChange={setEquipmentId}
          options={equipmentList.map((e) => ({ value: e.id, label: `${e.name} - ${e.description}` }))}
          placeholder="Select equipment"
        />
      )}

      {/* Trucking for AJK Job → pick a job code only */}
      {isShop && shopType === 'trucking_ajk' && (
        <Select
          label="Job Code"
          value={truckingJobId}
          onChange={setTruckingJobId}
          options={projects.map((p) => ({ value: p.id, label: `${p.project_num} - ${p.name}` }))}
          placeholder="Select job code"
        />
      )}

      {/* Trucking for Others → manual entry */}
      {isShop && shopType === 'trucking_others' && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={truckingOtherDesc}
            onChange={(e) => setTruckingOtherDesc(e.target.value)}
            placeholder="Who / what was the trucking for?"
            className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none"
          />
        </div>
      )}

      {/* Worker class — auto-set for shop, manual for job */}
      {isShop && shopType && (
        <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700">
          <span className="text-sm text-slate-400">Worker Class: </span>
          <span className="text-white font-medium">{shopWorkerClass(shopType)}</span>
        </div>
      )}
      {!isShop && (
        <Select
          label="Worker Class"
          value={workerClass}
          onChange={setWorkerClass}
          options={WORKER_CLASSES.map((c) => ({ value: c, label: c }))}
        />
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none resize-none"
        />
      </div>

      {/* Photo */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-700"
        />
      </div>

      {/* Clock In Button */}
      <button
        onClick={handleClockIn}
        disabled={clocking || (!isShop && !projectId) || (isShop && !shopType) || (shopType === 'trucking_ajk' && !truckingJobId) || (shopType === 'trucking_others' && !truckingOtherDesc.trim())}
        className="w-full py-4 bg-success hover:bg-success/90 text-white text-xl font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {clocking ? 'Clocking In...' : 'CLOCK IN'}
      </button>
    </div>
  );
}

// ── Reusable Select ──
function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
