import { useEffect, useRef, useState } from 'react'
import { COLORS, hexOf, toMin, fmtTime } from './utils'

const BIG = 96 // px per hour when an hour has events
const SMALL = 28 // px per hour when it is empty

// Overlapping tasks share the width side by side.
function layout(items) {
  const sorted = [...items].sort((x, y) => x.a - y.a || y.b - x.b)
  const out = []
  let cluster = []
  let end = -1
  const flush = () => {
    const lanes = []
    cluster.forEach((it) => {
      let l = lanes.findIndex((e) => e <= it.a)
      if (l < 0) { l = lanes.length; lanes.push(0) }
      lanes[l] = it.b
      it.lane = l
    })
    cluster.forEach((it) => out.push({ ...it, lanes: lanes.length }))
    cluster = []
    end = -1
  }
  sorted.forEach((it) => {
    if (cluster.length && it.a >= end) flush()
    cluster.push(it)
    end = Math.max(end, it.b)
  })
  if (cluster.length) flush()
  return out
}

export default function Calendar({ day, title, isToday, labels, setLabels, onShift }) {
  const [drag, setDrag] = useState(null)
  const startY = useRef(0)
  const scroller = useRef(null)

  const raw = [...day.sections.flatMap((s) => s.tasks), ...day.weekTasks]
    .filter((t) => t.start)
    .map((t) => {
      const a = toMin(t.start)
      let b = t.end ? toMin(t.end) : a + 30
      if (b <= a) b = 1440
      return { ...t, a, b }
    })
  const items = layout(raw)
  const first = Math.min(6, ...raw.map((i) => Math.floor(i.a / 60)))
  const last = Math.max(22, ...raw.map((i) => Math.ceil(i.b / 60)))

  // Hours with events are tall enough for every event to be readable; empty hours shrink.
  const rows = Array.from({ length: last - first }, (_, i) => first + i)
  const H = rows.map((h) => (raw.some((t) => t.a < (h + 1) * 60 && t.b > h * 60) ? BIG : SMALL))
  const off = [0]
  H.forEach((h, i) => off.push(off[i] + h))
  const y = (m) => {
    const c = Math.max(first * 60, Math.min(m, last * 60))
    const h = Math.min(Math.floor(c / 60), last - 1)
    return off[h - first] + ((c - h * 60) / 60) * H[h - first]
  }
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Open scrolled to the current time (today), or to the first event on other days.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const inRange = isToday && nowMin >= first * 60 && nowMin <= last * 60
    const target = inRange ? y(nowMin) : raw.length ? y(Math.min(...raw.map((t) => t.a))) : 0
    el.scrollTop = Math.max(0, target - 100)
  }, [title]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="cal-card">
        <div className="cal-head">{title}</div>
        {raw.length === 0 && <div className="empty">Add a time to a task (the ⋯ button) and it shows up here.</div>}
        <div className="cal" ref={scroller}>
          <div style={{ position: 'relative', height: off[rows.length] + 6 }}>
            {rows.map((h, i) => (
              <div key={h} className="hour" style={{ top: off[i] }}>{fmtTime(`${h % 24}:00`)}</div>
            ))}
            <div className="gutter" />
            <div className="lane-area">
              {isToday && nowMin >= first * 60 && nowMin <= last * 60 && <div className="now" style={{ top: y(nowMin) }} />}
              {items.map((t) => {
                const hex = hexOf(t.color) || '#9db89a'
                const h = Math.max(y(t.b) - y(t.a), 22)
                const when = `${fmtTime(t.start)}${t.end ? ` – ${fmtTime(t.end)}` : ''}${t.color && labels[t.color] ? ` · ${labels[t.color]}` : ''}`
                const dragging = drag?.id === t.id
                return (
                  <div
                    key={t.id}
                    className={dragging ? 'block dragging' : 'block'}
                    title={`${t.text} · ${when} (drag to move)`}
                    style={{
                      top: y(t.a),
                      height: h,
                      left: `${(t.lane / t.lanes) * 100}%`,
                      width: `calc(${100 / t.lanes}% - 3px)`,
                      background: hex + '40',
                      borderLeft: `4px solid ${hex}`,
                      transform: dragging ? `translateY(${drag.dy}px)` : undefined,
                    }}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startY.current = e.clientY; setDrag({ id: t.id, dy: 0 }) }}
                    onPointerMove={(e) => { if (dragging) setDrag({ id: t.id, dy: e.clientY - startY.current }) }}
                    onPointerUp={() => {
                      if (!dragging) return
                      const delta = Math.round(((drag.dy / BIG) * 60) / 15) * 15
                      setDrag(null)
                      if (delta) onShift(t.id, delta)
                    }}
                  >
                    {h < 40 ? (
                      <div className="one"><b>{t.text}</b> {when}</div>
                    ) : (
                      <><div className="one"><b>{t.text}</b></div><div className="one">{when}</div></>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="key">
        <b>Key:</b>
        <div className="legend">
          {COLORS.map((c) => (
            <label key={c.id}>
              <i style={{ background: c.hex }} />
              <input value={labels[c.id] || ''} placeholder={c.name}
                onChange={(e) => setLabels({ ...labels, [c.id]: e.target.value })} />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}