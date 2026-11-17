import { useState } from 'react'
import Ring from './Ring'
import { COLORS, hexOf, statusOf, fmtTime, avg, newId } from './utils'

const LABELS = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' }

function Task({ task, labels, onChange, onDelete, drag }) {
  const [open, setOpen] = useState(false)
  const status = statusOf(task.progress)
  const hex = hexOf(task.color)

  const setStatus = (s) => {
    if (s === 'not_started') onChange({ progress: 0 })
    if (s === 'done') onChange({ progress: 100 })
    if (s === 'in_progress' && status !== 'in_progress') onChange({ progress: 50 })
  }

  return (
    <div
      className={drag.over ? 'task over' : 'task'}
      style={hex ? { borderLeft: `4px solid ${hex}` } : undefined}
      onDragOver={drag.onOver}
      onDrop={drag.onDrop}
    >
      <div className="task-top">
        <span className="grip" draggable onDragStart={drag.onStart} onDragEnd={drag.onEnd} title="Drag to reorder">⠿</span>
        <span className={status === 'done' ? 'task-text done' : 'task-text'}>{task.text}</span>
        <button className="x small" onClick={() => setOpen(!open)} title="Time and color">⋯</button>
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
          <button className="add-btn" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  )
}

export default function Section({ section, labels, update, remove, ring, onTitle, note, sdrag, highlight }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [from, setFrom] = useState(null)
  const [over, setOver] = useState(null)

  const addTask = () => {
    if (!text.trim()) return
    update({ tasks: [...section.tasks, { id: newId(), text: text.trim(), progress: 0 }] })
    setText('')
  }

  const updateTask = (id, patch) =>
    update({ tasks: section.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })

  const move = (to) => {
    if (from !== null && from !== to) {
      const tasks = [...section.tasks]
      const [moved] = tasks.splice(from, 1)
      tasks.splice(to, 0, moved)
      update({ tasks })
    }
    setFrom(null)
    setOver(null)
  }

  return (
    <div className={'section' + (highlight ? ' today' : '') + (sdrag?.over ? ' over' : '')} onDragOver={sdrag?.onOver} onDrop={sdrag?.onDrop}>
      <div className="section-head">
        {sdrag && <span className="grip" draggable onDragStart={sdrag.onStart} onDragEnd={sdrag.onEnd} title="Drag to reorder">⠿</span>}
        <Ring value={ring ?? avg(section.tasks)} size={38} stroke={5} />
        <h2 className={onTitle ? 'link' : ''} onClick={onTitle}>{section.title}</h2>
        <button className="add-btn" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Task'}</button>
        {remove && <button className="x" onClick={remove}>×</button>}
      </div>
      {note && <div className="note">{note}</div>}
      {section.tasks.map((t, i) => (
        <Task
          key={t.id}
          task={t}
          labels={labels}
          onChange={(patch) => updateTask(t.id, patch)}
          onDelete={() => update({ tasks: section.tasks.filter((x) => x.id !== t.id) })}
          drag={{
            over: over === i && from !== null && from !== i,
            onStart: (e) => {
              setFrom(i)
              e.dataTransfer.setData('text/plain', t.id)
              e.dataTransfer.setDragImage(e.currentTarget.closest('.task'), 0, 0)
            },
            onEnd: () => { setFrom(null); setOver(null) },
            onOver: (e) => { e.preventDefault(); setOver(i) },
            onDrop: () => move(i),
          }}
        />
      ))}
      {adding && (
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