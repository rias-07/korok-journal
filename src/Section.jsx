import { useState } from 'react'
import Ring from './Ring'
import { COLORS, hexOf, statusOf, fmtTime, avg, newId, fmt } from './utils'

const LABELS = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' }

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function RepeatForm({ defaultDay, onStart }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState([defaultDay])
  const [until, setUntil] = useState('')
  if (!open) return <button className="add-btn" onClick={() => setOpen(true)}>🔁 Repeat…</button>
  const toggle = (i) => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())
  return (
    <div className="repeat">
      <div className="swatches">
        {DAYS.map((d, i) => (
          <button key={i} title={DAYNAMES[i]} className={days.includes(i) ? 'chip active' : 'chip'} onClick={() => toggle(i)}>{d}</button>
        ))}
      </div>
      <label>Until (optional) <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
      <button className="add-btn" disabled={!days.length} onClick={() => onStart(days, until)}>Start repeating</button>
    </div>
  )
}

function Task({ task, labels, onChange, onDelete, drag, rep }) {
  const [open, setOpen] = useState(false)
  const status = statusOf(task.progress)
  const hex = hexOf(task.color)

  const setStatus = (s) => {
    if (s === 'not_started') onChange({ progress: 0 })
    if (s === 'done') onChange({ progress: 100 })
    if (s === 'in_progress' && status !== 'in_progress') onChange({ progress: 50 })
  }
  const close = () => {
    if (!task.text.trim()) onChange({ text: 'Untitled task' })
    setOpen(false)
  }

  return (
    <div
      className={drag.over ? 'task over' : 'task'}
      style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}
      onDragOver={drag.onOver}
      onDrop={drag.onDrop}
    >
      <div className="task-top">
        <span className="grip" draggable onDragStart={drag.onStart} onDragEnd={drag.onEnd} title="Drag to reorder or move">⠿</span>
        <span className={status === 'done' ? 'task-text done' : 'task-text'} onDoubleClick={() => setOpen(true)} title="Double-click to rename">
          {task.ruleId ? '🔁 ' : ''}{task.text}
        </span>
        <button className="x small" onClick={() => (open ? close() : setOpen(true))} title="Rename, time and color">⋯</button>
        <button className="x" onClick={onDelete}>×</button>
      </div>
      {task.start && (
        <div className="time">
          {fmtTime(task.start)}
          {task.end && ` – ${fmtTime(task.end)}`}
        </div>
      )}
      <div className="status-row">
        {Object.keys(LABELS).map((s) => (
          <button key={s} className={status === s ? 'chip active' : 'chip'} onClick={() => setStatus(s)}>
            {LABELS[s]}
          </button>
        ))}
      </div>
      <div className="slider-row">
        <input type="range" min="0" max="100" value={task.progress}
          onChange={(e) => onChange({ progress: Number(e.target.value) })} />
        <span>{task.progress}%</span>
      </div>
      {open && (
        <div className="details">
          <input className="name" autoFocus value={task.text} placeholder="Task name"
            onChange={(e) => onChange({ text: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && close()} />
          <label>From <input type="time" value={task.start || ''} onChange={(e) => onChange({ start: e.target.value })} /></label>
          <label>To <input type="time" value={task.end || ''} onChange={(e) => onChange({ end: e.target.value })} /></label>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c.id}
                className={task.color === c.id ? 'sw on' : 'sw'}
                style={{ background: c.hex }}
                title={labels[c.id] || c.name}
                onClick={() => onChange({ color: task.color === c.id ? undefined : c.id })}
              />
            ))}
          </div>
          {rep && (rep.rule ? (
            <div className="repeat">
              <span>🔁 Every {rep.rule.days.map((d) => DAYNAMES[d]).join(', ')}{rep.rule.endDate ? ` until ${fmt(rep.rule.endDate, { month: 'short', day: 'numeric' })}` : ''}</span>
              <button className="add-btn" onClick={rep.sync}>Apply to upcoming days</button>
              <button className="add-btn" onClick={rep.stop}>Stop repeating</button>
            </div>
          ) : (
            <RepeatForm defaultDay={rep.defaultDay} onStart={rep.start} />
          ))}
          <button className="add-btn" onClick={close}>Done</button>
        </div>
      )}
    </div>
  )
}

// tdnd = shared task drag state from App, so tasks can move between sections.
export default function Section({ section, labels, update, remove, ring, onTitle, note, sdrag, tdnd, highlight, repeat }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const key = section.id
  const collapsed = !!section.collapsed
  const done = section.tasks.filter((t) => t.progress >= 100).length
  const endOver = tdnd?.drag && tdnd.over?.key === key && tdnd.over.index === section.tasks.length

  const addTask = () => {
    if (!text.trim()) return
    update({ tasks: [...section.tasks, { id: newId(), text: text.trim(), progress: 0 }] })
    setText('')
  }

  const updateTask = (id, patch) =>
    update({ tasks: section.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })

  const end = () => { tdnd.setDrag(null); tdnd.setOver(null) }

  return (
    <div
      className={'section' + (highlight ? ' today' : '') + (sdrag?.over || endOver ? ' over' : '')}
      onDragOver={(e) => {
        if (tdnd?.drag) { e.preventDefault(); tdnd.setOver({ key, index: section.tasks.length }) }
        else sdrag?.onOver(e)
      }}
      onDrop={() => {
        if (tdnd?.drag) { tdnd.move(tdnd.drag, { key, index: section.tasks.length }); end() }
        else sdrag?.onDrop()
      }}
    >
      <div className="section-head">
        {sdrag && <span className="grip" draggable onDragStart={sdrag.onStart} onDragEnd={sdrag.onEnd} title="Drag to reorder">⠿</span>}
        <button className="x small" onClick={() => update({ collapsed: !collapsed })} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▸' : '▾'}
        </button>
        <Ring value={ring ?? avg(section.tasks)} size={38} stroke={5} />
        <h2 className={onTitle ? 'link' : ''} onClick={onTitle}>{section.title}</h2>
        {collapsed ? (
          <span className="count">{done}/{section.tasks.length}</span>
        ) : (
          <button className="add-btn" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Task'}</button>
        )}
        {remove && <button className="x" onClick={remove}>×</button>}
      </div>
      {!collapsed && note && <div className="note">{note}</div>}
      {!collapsed && section.tasks.map((t, i) => (
        <Task
          key={t.id}
          task={t}
          labels={labels}
          rep={repeat?.(t)}
          onChange={(patch) => updateTask(t.id, patch)}
          onDelete={() => update({ tasks: section.tasks.filter((x) => x.id !== t.id) })}
          drag={{
            over: !!tdnd?.drag && tdnd.over?.key === key && tdnd.over.index === i && !(tdnd.drag.key === key && tdnd.drag.index === i),
            onStart: (e) => {
              tdnd.setDrag({ key, index: i })
              e.dataTransfer.setData('text/plain', t.id)
              e.dataTransfer.setDragImage(e.currentTarget.closest('.task'), 0, 0)
            },
            onEnd: end,
            onOver: (e) => { if (tdnd?.drag) { e.preventDefault(); e.stopPropagation(); tdnd.setOver({ key, index: i }) } },
            onDrop: (e) => { if (tdnd?.drag) { e.stopPropagation(); tdnd.move(tdnd.drag, { key, index: i }); end() } },
          }}
        />
      ))}
      {!collapsed && adding && (
        <div className="add-row">
          <input
            autoFocus
            value={text}
            placeholder="Add a task…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button onClick={addTask}>Add</button>
        </div>
      )}
    </div>
  )
}