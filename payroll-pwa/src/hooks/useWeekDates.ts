import { useMemo } from 'react'

export function getWeekBounds(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { monday, sunday }
}

export function isCurrentWeek(date: Date) {
  const now = new Date()
  const { monday, sunday } = getWeekBounds(now)
  return date >= monday && date <= sunday
}

export function useWeekDates(weekOffset: number) {
  return useMemo(() => {
    const now = new Date()
    now.setDate(now.getDate() + weekOffset * 7)
    const { monday, sunday } = getWeekBounds(now)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }

    return { monday, sunday, days, isCurrent: weekOffset === 0 }
  }, [weekOffset])
}
