import { useState } from 'react'

export const DEFAULT_PRIZES = {
  wheel: ['Sweet treat 🍪', 'Favorite drink ☕', '10-minute dance break', 'One episode, no guilt', 'Fresh flowers 🌸', 'Walk in the sun', 'Guilt-free nap', 'New song on repeat'],
  gacha: ['Dinner at a favorite spot', 'Movie night with friends', 'Something small from the wishlist', 'Full self-care evening', 'Try a new cafe', 'A whole afternoon off'],
}

const PRAISE = [
  'Yahaha! You cleared a whole section!',
  'The forest is cheering for you 🍃',
  'Look at you, a true hero of the woods!',
  'Another section down. Sprout power!',
]
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const SEG = [['#2f5d3a', '#f5f1e6'], ['#5f8f4e', '#f5f1e6'], ['#b7c9a8', '#1f3d2a'], ['#1f4d3a', '#f5f1e6']]

function Wheel({ prizes, canSpin, onResult }) {
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const n = prizes.length
  const seg = 360 / n
  const C = 120
  const R = 112
  const pt = (deg) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [C + R * Math.cos(a), C + R * Math.sin(a)]
  }

  const spin = () => {
    const win = Math.floor(Math.random() * n)
    const target = 360 - (win + 0.5) * seg
    setRot(rot + 360 * 5 + ((((target - (rot % 360)) % 360) + 360) % 360))
    setBusy(true)
    setTimeout(() => { setBusy(false); onResult(prizes[win]) }, 4000)
  }

  return (
    <div className="wheel">
      <svg viewBox="0 0 240 240" width="230" height="230">
        <g style={{ transform: `rotate(${rot}deg)`, transformBox: 'fill-box', transformOrigin: 'center', transition: 'transform 4s cubic-bezier(.15,.7,.2,1)' }}>
          {prizes.map((p, i) => {
            const [x1, y1] = pt(i * seg)
            const [x2, y2] = pt((i + 1) * seg)
            const [bg, fg] = SEG[i % SEG.length]
            return (
              <g key={i}>
                <path d={`M${C} ${C} L${x1} ${y1} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={bg} stroke="#f5f1e6" strokeWidth="2" />
                <text transform={`rotate(${(i + 0.5) * seg - 90} ${C} ${C}) translate(${C + 26} ${C})`}
                  dominantBaseline="central" fontSize="9" fill={fg}>
                  {p.length > 14 ? p.slice(0, 13) + '…' : p}
                </text>
              </g>
            )
          })}
          <circle cx={C} cy={C} r="16" fill="#f5f1e6" stroke="#2f5d3a" strokeWidth="3" />
          <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fontSize="14">🍃</text>
        </g>
        <polygon points={`${C - 10},2 ${C + 10},2 ${C},24`} fill="#8a6a4a" stroke="#1f3d2a" strokeWidth="2" />
      </svg>
      <button className="big-btn" disabled={!canSpin || busy} onClick={spin}>{busy ? 'Spinning…' : 'Spin'}</button>
    </div>
  )
}

function Gacha({ prizes, unlocked, weekPct, threshold, found, onPull }) {
  const [shaking, setShaking] = useState(false)
  const pull = () => {
    setShaking(true)
    setTimeout(() => { setShaking(false); onPull(pick(prizes)) }, 1500)
  }
  return (
    <div className="gacha">
      <div className={shaking ? 'tree shake' : 'tree'}>🌳</div>
      {found ? (
        <div className="result"><b>🍃 You found a Korok! This week's prize:</b><br />{found}</div>
      ) : unlocked ? (
        <button className="big-btn" disabled={shaking} onClick={pull}>{shaking ? 'Rustle rustle…' : 'Shake the tree'}</button>
      ) : (
        <p className="hint">Reach {threshold}% this week to shake the tree. You're at {Math.round(weekPct)}%.</p>
      )}
    </div>
  )
}

export default function Rewards({ prizes, setPrizes, completed, spinsLeft, onSpun, weekPct, threshold, found, onPull }) {
  const [msg, setMsg] = useState(null)
  const wheel = prizes.wheel.filter(Boolean)
  const gacha = prizes.gacha.filter(Boolean)

  return (
    <div>
      <div className="card">
        <h2>Korok spin wheel</h2>
        <p className="hint">{completed} section{completed === 1 ? '' : 's'} cleared today · {spinsLeft} spin{spinsLeft === 1 ? '' : 's'} left. Finish a whole section to earn a spin.</p>
        {wheel.length >= 3 ? (
          <Wheel prizes={wheel} canSpin={spinsLeft > 0}
            onResult={(prize) => { setMsg({ prize, praise: pick(PRAISE) }); onSpun() }} />
        ) : <p className="hint">Add at least 3 prizes below.</p>}
        {msg && <div className="result"><b>{msg.prize}</b><br />{msg.praise}</div>}
      </div>

      <div className="card">
        <h2>Weekly Korok tree</h2>
        {gacha.length >= 1 ? (
          <Gacha prizes={gacha} unlocked={weekPct >= threshold} weekPct={weekPct} threshold={threshold} found={found} onPull={onPull} />
        ) : <p className="hint">Add at least 1 prize below.</p>}
      </div>

      <details className="card">
        <summary>Edit prizes (one per line)</summary>
        <label>Wheel</label>
        <textarea rows="6" value={prizes.wheel.join('\n')} onChange={(e) => setPrizes('wheel', e.target.value)} />
        <label>Weekly tree</label>
        <textarea rows="5" value={prizes.gacha.join('\n')} onChange={(e) => setPrizes('gacha', e.target.value)} />
      </details>
    </div>
  )
}