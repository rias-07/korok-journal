import { useState } from 'react'
import korok from './assets/korok.png'

// Pops up, hops with a tilt a few times, then slides away. Tap it to send it away early.
export default function Celebrate() {
  const [bye, setBye] = useState(false)
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <div
      className={bye ? 'cheer bye' : 'cheer'}
      aria-live="polite"
      onClick={() => setBye(true)}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setHidden(true) }}
    >
      <div className="bubble">Yahaha! Good job!</div>
      <img src={korok} alt="" />
    </div>
  )
}