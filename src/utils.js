export const COLORS = [
  { id: 'moss', hex: '#5f8f4e', name: 'Moss' },
  { id: 'sage', hex: '#9db89a', name: 'Sage' },
  { id: 'fern', hex: '#2f7d58', name: 'Fern' },
  { id: 'pine', hex: '#1f4d3a', name: 'Pine' },
  { id: 'blossom', hex: '#d98fa3', name: 'Blossom' },
  { id: 'lavender', hex: '#a58fc9', name: 'Lavender' },
  { id: 'buttercup', hex: '#e3b94a', name: 'Buttercup' },
  { id: 'bark', hex: '#8a6a4a', name: 'Bark' },
]

export const hexOf = (id) => COLORS.find((c) => c.id === id)?.hex
export const newId = () => crypto.randomUUID()
export const makeSection = (title) => ({ id: newId(), title, tasks: [] })
export const statusOf = (p) => (p >= 100 ? 'done' : p > 0 ? 'in_progress' : 'not_started')
export const avg = (tasks) =>
  tasks.length ? tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length : 0

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Fresh day: ids are stable so edits on a not-yet-saved day still match.
export const fresh = (template) => ({
  sections: template.map((title, i) => ({ id: 'tpl' + i, title, tasks: [] })),
  weekTasks: [],
})

const pad = (n) => String(n).padStart(2, '0')
export const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromIso = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s, n) => {
  const d = fromIso(s)
  d.setDate(d.getDate() + n)
  return toIso(d)
}
export const weekStart = (s) => addDays(s, -fromIso(s).getDay()) // Sunday
export const weekDates = (s) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(s), i))
export const fmt = (s, opts) => fromIso(s).toLocaleDateString(undefined, opts)

export const toHHMM = (m) => {
  const c = Math.min(m, 1439)
  return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`
}