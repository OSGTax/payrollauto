import { useEffect, useState } from 'react'

export function useTimer(startTime: string | null) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!startTime) {
      setElapsed('')
      return
    }

    function tick() {
      const diff = Date.now() - new Date(startTime!).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])

  return elapsed
}
