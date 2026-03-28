import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminSettings() {
  const [plowingEnabled, setPlowingEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('key', 'plowing_enabled').single()
      .then(({ data }) => {
        setPlowingEnabled(data?.value === 'true')
        setLoading(false)
      })
  }, [])

  async function togglePlowing() {
    const newVal = !plowingEnabled
    await supabase.from('app_settings').upsert({ key: 'plowing_enabled', value: String(newVal) })
    setPlowingEnabled(newVal)
  }

  if (loading) return <div className="p-4 text-slate-400">Loading...</div>

  return (
    <div className="p-4">
      <h2 className="text-white font-semibold mb-4">App Settings</h2>

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">Snow Plowing</div>
            <div className="text-xs text-slate-400">Show the PLOWING tab for all workers</div>
          </div>
          <button
            onClick={togglePlowing}
            className={`w-12 h-6 rounded-full transition-colors ${plowingEnabled ? 'bg-green-500' : 'bg-slate-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${plowingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
