import { useEffect, useRef, useState } from 'react'
import Ring from './Ring'
import { avg, fmt, fromIso, toIso, addDays, addMonths } from './utils'

const GOOD_DAY = 70 // a "good day" for streaks
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' }))
const YEARS = Array.from({ length: 21 }, (_, i) => 2020 + i)
const tasksOf = (d) => [...d.sections.flatMap((s) => s.tasks), ...d.weekTasks]

export default function Journal({ getDay, today, setNote, openDay, vm, setVm }) {
  const [sel, setSel] = useState(null)
  const noteRef = useRef(null)

  useEffect(() => {
    if (sel) noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [sel])

  const go = (v) => { setVm(v); setSel(null) }
  const first = fromIso(vm)
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const isos = Array.from({ length: count }, (_, i) => addDays(vm, i))
  const cells = [...Array(first.getDay()).fill(null), ...isos]

  const infos = isos.map((iso) => {
    const d = getDay(iso)
    const t = tasksOf(d)
    return { n: t.length, pct: avg(t), done: t.filter((x) => x.progress >= 100).length, note: !!d.note }
  })
  const tasksDone = infos.reduce((s, i) => s + i.done, 0)
  const activeDays = infos.filter((i) => i.n > 0).length
  let best = 0
  let run = 0
  infos.forEach((i) => {
    run = i.n > 0 && i.pct >= GOOD_DAY ? run + 1 : 0
    best = Math.max(best, run)
  })

  const currentMonth = today.slice(0, 7) + '-01'
  const selDay = sel ? getDay(sel) : null
  const selTasks = selDay ? tasksOf(selDay) : []

  return (
    <div>
      <div className="jnav">
        <button onClick={() => go(addMonths(vm, -1))}>‹</button>
        <select value={first.getMonth()} onChange={(e) => go(toIso(new Date(first.getFullYear(), Number(e.target.value), 1)))}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={first.getFullYear()} onChange={(e) => go(toIso(new Date(Number(e.target.value), first.getMonth(), 1)))}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => go(addMonths(vm, 1))}>›</button>
        <button className="today-btn" disabled={vm === currentMonth} onClick={() => go(currentMonth)}>Today</button>
      </div>

      <div className="stats">
        <div><b>{tasksDone}</b>tasks done</div>
        <div><b>{activeDays}</b>days with tasks</div>
        <div><b>{best}</b>best streak</div>
      </div>

      <div className="grid">
        {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
        {cells.map((iso, i) => {
          if (!iso) return <div key={'b' + i} />
          const info = infos[Number(iso.slice(8)) - 1]
          return (
            <button key={iso} className={'cell' + (iso === sel ? ' sel' : '') + (iso === today ? ' istoday' : '')}
              onClick={() => setSel(iso === sel ? null : iso)}>
              <span className="dn">{Number(iso.slice(8))}{info.note ? ' ✎' : ''}</span>
              <Ring value={info.pct} size={30} stroke={4} label={false} />
            </button>
          )
        })}
      </div>

      {sel && (
        <div className="card" ref={noteRef}>
          <div className="jhead">
            <b>{fmt(sel, { weekday: 'long', month: 'long', day: 'numeric' })}</b>
            <span>{selTasks.filter((t) => t.progress >= 100).length} of {selTasks.length} tasks done</span>
            <button className="x" onClick={() => setSel(null)} title="Close">×</button>
          </div>
          <textarea className="note-box" rows="5" autoFocus value={selDay.note ?? ''} placeholder="How was your day?"
            onChange={(e) => setNote(sel, e.target.value)} />
          <button className="add-btn" onClick={() => openDay(sel)}>Open day page</button>
        </div>
      )}
    </div>
  )
}