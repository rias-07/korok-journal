import { useEffect, useState } from 'react'
import '@fontsource/dancing-script/400.css'
import './index.css'
import { useStoredState } from './useStoredState'
import Ring from './Ring'
import Section from './Section'
import Calendar from './Calendar'
import Journal from './Journal'
import Celebrate from './Celebrate'
import korok from './assets/korok.png'
import Rewards, { DEFAULT_PRIZES } from './Rewards'
import { makeSection, fresh, avg, toIso, addDays, weekStart, weekDates, fmt, toMin, toHHMM, fromIso, newId, applyRepeats } from './utils'

const GACHA_AT = 70 // weekly completion % needed to shake the tree
const PAGES = [['journal', 'Journal'], ['day', 'Day'], ['week', 'Week'], ['calendar', 'Calendar'], ['rewards', 'Rewards']]
const initial = {
  labels: {},
  template: ['Morning', 'Afternoon', 'Evening'],
  days: {},
  repeats: [],
  weekOrder: {},
  prizes: DEFAULT_PRIZES,
  rewards: { used: {}, gacha: {} },
}
const tasksOf = (d) => [...d.sections.flatMap((s) => s.tasks), ...d.weekTasks]
const moveItem = (arr, from, to) => {
  const a = [...arr]
  const [m] = a.splice(from, 1)
  a.splice(to, 0, m)
  return a
}

export default function App() {
  const [state, setState, loaded] = useStoredState(initial)
  const [today] = useState(() => toIso(new Date()))
  const [date, setDate] = useState(today)
  const [vm, setVm] = useState(() => today.slice(0, 7) + '-01')
  const [page, setPage] = useState('day')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [secFrom, setSecFrom] = useState(null)
  const [secOver, setSecOver] = useState(null)
  const [tdrag, setTdrag] = useState(null)
  const [tover, setTover] = useState(null)
  const [cheer, setCheer] = useState(0)

  // Fill the visible week with any repeating tasks that are due.
  useEffect(() => {
    if (loaded) setState((s) => applyRepeats(s, weekDates(date)))
  }, [loaded, date, state.repeats]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null

  const labels = state.labels ?? {}
  const prizes = state.prizes ?? DEFAULT_PRIZES
  const rewards = state.rewards ?? { used: {}, gacha: {} }
  const getDay = (iso) => state.days[iso] ?? fresh(state.template)
  const setDayFor = (iso, fn) =>
    setState((s) => ({ ...s, days: { ...s.days, [iso]: fn(s.days[iso] ?? fresh(s.template)) } }))

  const day = getDay(date)
  const dayTasks = day.sections.flatMap((s) => s.tasks)
  const week = weekDates(date)
  const savedOrder = state.weekOrder?.[weekStart(date)]
  const order = savedOrder && savedOrder.length === 7 ? savedOrder : week
  const weekAll = week.flatMap((i) => tasksOf(getDay(i)))
  const count = (list) => list.filter((t) => t.progress >= 100).length

  // Section drag-and-drop (handle on each section header)
  const sdragFor = (i, onReorder) => ({
    over: secOver === i && secFrom !== null && secFrom !== i,
    onStart: (e) => {
      setSecFrom(i)
      e.dataTransfer.setData('text/plain', 'section')
      e.dataTransfer.setDragImage(e.currentTarget.closest('.section'), 0, 0)
    },
    onEnd: () => { setSecFrom(null); setSecOver(null) },
    onOver: (e) => { if (secFrom !== null) { e.preventDefault(); setSecOver(i) } },
    onDrop: () => {
      if (secFrom !== null && secFrom !== i) onReorder(secFrom, i)
      setSecFrom(null)
      setSecOver(null)
    },
  })

  const reorderDay = (from, to) =>
    setState((s) => {
      const d = s.days[date] ?? fresh(s.template)
      const sections = moveItem(d.sections, from, to)
      return { ...s, template: sections.map((x) => x.title), days: { ...s.days, [date]: { ...d, sections } } }
    })

  const reorderWeek = (from, to) =>
    setState((s) => ({ ...s, weekOrder: { ...(s.weekOrder ?? {}), [weekStart(date)]: moveItem(order, from, to) } }))

  const updateSection = (id, patch) =>
    setDayFor(date, (d) => ({ ...d, sections: d.sections.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const addSection = () => {
    const t = title.trim()
    if (!t) return
    setState((s) => {
      const d = s.days[date] ?? fresh(s.template)
      return { ...s, template: [...s.template, t], days: { ...s.days, [date]: { ...d, sections: [...d.sections, makeSection(t)] } } }
    })
    setTitle('')
    setAdding(false)
  }

  const removeSection = (id) =>
    setState((s) => {
      const d = s.days[date] ?? fresh(s.template)
      const gone = d.sections.find((x) => x.id === id)
      return { ...s, template: s.template.filter((t) => t !== gone?.title), days: { ...s.days, [date]: { ...d, sections: d.sections.filter((x) => x.id !== id) } } }
    })

  // Dragging a calendar block moves the task's time (snaps to 15 minutes).
  const shiftTask = (id, delta) => {
    const shift = (t) => {
      if (t.id !== id) return t
      const a = toMin(t.start)
      const dur = t.end ? (toMin(t.end) > a ? toMin(t.end) - a : 1440 - a) : 0
      const n = Math.max(0, Math.min(a + delta, 1440 - Math.max(dur, 15)))
      return { ...t, start: toHHMM(n), ...(t.end ? { end: toHHMM(n + dur) } : {}) }
    }
    setDayFor(date, (d) => ({
      ...d,
      sections: d.sections.map((s) => ({ ...s, tasks: s.tasks.map(shift) })),
      weekTasks: d.weekTasks.map(shift),
    }))
  }

  // Repeating tasks
  const startRepeat = (task, sectionTitle, days, until) => {
    const rule = { id: newId(), text: task.text, section: sectionTitle, days, start: task.start || '', end: task.end || '', color: task.color, startDate: date, endDate: until || null }
    setState((s) => {
      const d = s.days[date] ?? fresh(s.template)
      const sections = d.sections.map((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === task.id ? { ...t, ruleId: rule.id } : t)) }))
      return { ...s, repeats: [...(s.repeats ?? []), rule], days: { ...s.days, [date]: { ...d, sections, applied: [...(d.applied ?? []), rule.id] } } }
    })
  }
  const stopRepeat = (id) =>
    setState((s) => {
      const days = {}
      for (const [iso, d] of Object.entries(s.days)) {
        if (iso > date) days[iso] = { ...d, sections: d.sections.map((x) => ({ ...x, tasks: x.tasks.filter((t) => !(t.ruleId === id && t.progress === 0)) })) }
        else if (iso === date) days[iso] = { ...d, sections: d.sections.map((x) => ({ ...x, tasks: x.tasks.map((t) => (t.ruleId === id ? { ...t, ruleId: undefined } : t)) })) }
        else days[iso] = d
      }
      return { ...s, repeats: (s.repeats ?? []).filter((r) => r.id !== id), days }
    })
  const syncRepeat = (task) =>
    setState((s) => {
      const patch = { text: task.text, start: task.start || '', end: task.end || '', color: task.color }
      const days = {}
      for (const [iso, d] of Object.entries(s.days)) {
        days[iso] = iso > date ? { ...d, sections: d.sections.map((x) => ({ ...x, tasks: x.tasks.map((t) => (t.ruleId === task.ruleId && t.progress === 0 ? { ...t, ...patch } : t)) })) } : d
      }
      return { ...s, repeats: (s.repeats ?? []).map((r) => (r.id === task.ruleId ? { ...r, ...patch } : r)), days }
    })
  const repeatApi = (section) => (task) => ({
    rule: (state.repeats ?? []).find((r) => r.id === task.ruleId),
    defaultDay: fromIso(date).getDay(),
    start: (days, until) => startRepeat(task, section.title, days, until),
    stop: () => stopRepeat(task.ruleId),
    sync: () => syncRepeat(task),
  })

  // Move a task within or between sections (Day page) or between dates (Week page).
  const moveTask = (from, to) => {
    if (page === 'day') {
      setDayFor(date, (d) => {
        const src = d.sections.find((x) => x.id === from.key)
        const dst = d.sections.find((x) => x.id === to.key)
        const task = src?.tasks[from.index]
        if (!task || !dst) return d
        if (src === dst) {
          const tasks = moveItem(src.tasks, from.index, Math.min(to.index, src.tasks.length - 1))
          return { ...d, sections: d.sections.map((x) => (x === src ? { ...x, tasks } : x)) }
        }
        return {
          ...d,
          sections: d.sections.map((x) =>
            x === src ? { ...x, tasks: x.tasks.filter((_, i) => i !== from.index) }
            : x === dst ? { ...x, tasks: [...x.tasks.slice(0, to.index), task, ...x.tasks.slice(to.index)] }
            : x),
        }
      })
    } else {
      setState((s) => {
        const sd = s.days[from.key] ?? fresh(s.template)
        const dd = s.days[to.key] ?? fresh(s.template)
        const task = sd.weekTasks[from.index]
        if (!task) return s
        if (from.key === to.key) {
          const weekTasks = moveItem(sd.weekTasks, from.index, Math.min(to.index, sd.weekTasks.length - 1))
          return { ...s, days: { ...s.days, [from.key]: { ...sd, weekTasks } } }
        }
        return {
          ...s,
          days: {
            ...s.days,
            [from.key]: { ...sd, weekTasks: sd.weekTasks.filter((_, i) => i !== from.index) },
            [to.key]: { ...dd, weekTasks: [...dd.weekTasks.slice(0, to.index), task, ...dd.weekTasks.slice(to.index)] },
          },
        }
      })
    }
  }
  const tdnd = { drag: tdrag, over: tover, setDrag: setTdrag, setOver: setTover, move: moveTask }

  // Rewards always use the real current day and week.
  const todayDay = getDay(today)
  const completed = todayDay.sections.filter((s) => s.tasks.length && avg(s.tasks) >= 100).length
  const spinsLeft = completed - (rewards.used?.[today] ?? 0)
  const realWeek = weekDates(today).flatMap((i) => tasksOf(getDay(i)))
  const thisWeek = weekStart(today)

  const isThisWeek = weekStart(date) === thisWeek
  const step = page === 'week' ? 7 : 1
  const atToday = page === 'week' ? isThisWeek : date === today
  const longDate = fmt(date, { weekday: 'long', month: 'long', day: 'numeric' })
  const rangeShort = `${fmt(week[0], { month: 'short', day: 'numeric' })} – ${fmt(week[6], { month: 'short', day: 'numeric' })}`
  const weekLabel = isThisWeek ? 'This Week' : `Week of ${rangeShort}`
  const navLabel = page === 'week' ? weekLabel : date === today ? 'Today' : fmt(date, { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="app">
      <h1><img src={korok} className="logo" alt="" /> Korok Journal </h1>
      {cheer > 0 && <Celebrate key={cheer} />}
      <div className="tabs">
        {PAGES.map(([id, name]) => (
          <button key={id} className={page === id ? 'tab active' : 'tab'} onClick={() => setPage(id)}>{name}</button>
        ))}
      </div>

      {page !== 'rewards' && page !== 'journal' && (
        <div className="nav">
          <button onClick={() => setDate(addDays(date, -step))}>‹</button>
          <button className="today" disabled={atToday} onClick={() => setDate(today)}>{navLabel}</button>
          <button onClick={() => setDate(addDays(date, step))}>›</button>
        </div>
      )}

      {page === 'journal' && (
        <Journal
          getDay={getDay} today={today} vm={vm} setVm={setVm}
          setNote={(iso, note) => setDayFor(iso, (d) => ({ ...d, note }))}
          openDay={(iso) => { setDate(iso); setPage('day') }}
        />
      )}

      {page === 'day' && (
        <>
          <div className="summary">
            <Ring value={avg(dayTasks)} size={96} stroke={10} />
            <div><b>{longDate}</b>{count(dayTasks)} of {dayTasks.length} tasks done</div>
          </div>
          {day.sections.map((s, i) => (
            <Section key={s.id} section={s} labels={labels} tdnd={tdnd} repeat={repeatApi(s)} onCelebrate={() => setCheer((c) => c + 1)} sdrag={sdragFor(i, reorderDay)}
              update={(patch) => updateSection(s.id, patch)} remove={() => removeSection(s.id)} />
          ))}
          {adding ? (
            <div className="add-row">
              <input autoFocus value={title} placeholder="e.g. Night" onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAdding(false) }} />
              <button onClick={addSection}>Add</button>
            </div>
          ) : (
            <button className="add-section" onClick={() => setAdding(true)}>+ Add section</button>
          )}
        </>
      )}

      {page === 'week' && (
        <>
          <div className="summary">
            <Ring value={avg(weekAll)} size={96} stroke={10} />
            <div>
              <b>{weekLabel}</b>
              {isThisWeek && <>{rangeShort}<br /></>}
              {count(weekAll)} of {weekAll.length} tasks done
            </div>
          </div>
          {order.map((iso, i) => {
            const d = getDay(iso)
            const dt = d.sections.flatMap((s) => s.tasks)
            return (
              <Section key={iso} labels={labels} tdnd={tdnd} highlight={iso === today} sdrag={sdragFor(i, reorderWeek)}
                section={{ id: iso, title: fmt(iso, { weekday: 'short', month: 'short', day: 'numeric' }), tasks: d.weekTasks, collapsed: d.weekCollapsed }}
                ring={avg([...d.weekTasks, ...dt])}
                onTitle={() => { setDate(iso); setPage('day') }}
                note={dt.length ? `${dt.length} logged from Day page · ${Math.round(avg(dt))}% done` : null}
                update={(patch) => setDayFor(iso, (x) => ('tasks' in patch ? { ...x, weekTasks: patch.tasks } : { ...x, weekCollapsed: patch.collapsed }))} />
            )
          })}
        </>
      )}

      {page === 'calendar' && (
        <Calendar day={day} title={longDate} isToday={date === today} labels={labels}
          setLabels={(l) => setState((s) => ({ ...s, labels: l }))} onShift={shiftTask} />
      )}

      {page === 'rewards' && (
        <Rewards
          prizes={prizes}
          setPrizes={(kind, text) => setState((s) => ({ ...s, prizes: { ...(s.prizes ?? DEFAULT_PRIZES), [kind]: text.split('\n') } }))}
          completed={completed}
          spinsLeft={spinsLeft}
          onSpun={() => setState((s) => ({ ...s, rewards: { ...rewards, used: { ...rewards.used, [today]: (rewards.used?.[today] ?? 0) + 1 } } }))}
          weekPct={avg(realWeek)}
          threshold={GACHA_AT}
          found={rewards.gacha?.[thisWeek]}
          onPull={(prize) => setState((s) => ({ ...s, rewards: { ...rewards, gacha: { ...rewards.gacha, [thisWeek]: prize } } }))}
          onReset={() =>
            setState((s) => {
              const used = { ...(s.rewards?.used ?? {}) }
              const gacha = { ...(s.rewards?.gacha ?? {}) }
              delete used[today]      // gives back today's wheel spins
              delete gacha[thisWeek]  // lets you talk to the Deku Tree again
              return { ...s, rewards: { ...s.rewards, used, gacha } }
            })
          }
        />
      )}
    </div>
  )
}