export default function Ring({ value, size = 40, stroke = 5, label = true }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const mid = size / 2
  return (
    <svg width={size} height={size} style={{ flex: 'none' }}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--sage)" strokeOpacity=".35" strokeWidth={stroke} />
      <circle
        cx={mid} cy={mid} r={r} fill="none" stroke="var(--forest)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
        transform={`rotate(-90 ${mid} ${mid})`} className="ring-fg"
      />
      {label && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 4.2} fill="var(--deep)">
          {Math.round(value)}%
        </text>
      )}
    </svg>
  )
}