import { useMemo, useState } from 'react'
import { useDiary } from '../store/useDiary'

export default function TrendChart() {
  const { state } = useDiary()
  const [range, setRange] = useState<14 | 30 | 90>(30)

  const trackedNames = useMemo(
    () => state.symptomDefs.filter(d => d.tracked).map(d => d.name),
    [state.symptomDefs]
  )

  const [active, setActive] = useState<string | null>(trackedNames[0] ?? null)
  const selected = active ?? trackedNames[0] ?? null

  const data = useMemo(() => {
    const today = new Date()
    const dates: string[] = []
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dates.push(s)
    }
    return dates.map(date => {
      const entry = state.entries[date]
      const sym = entry?.symptoms.find(s => s.name === selected)
      return { date, level: sym?.level ?? null, value: sym?.value ?? null }
    })
  }, [state.entries, range, selected])

  const W = 480, H = 180, PAD_L = 28, PAD_R = 12, PAD_T = 20, PAD_B = 24
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const pts = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(1, data.length - 1)) * innerW,
    y: d.level === null ? null : PAD_T + (1 - d.level / 10) * innerH,
    level: d.level,
    date: d.date
  }))

  const path = pts.reduce((acc, p, i) => {
    if (p.y === null) return acc
    const prev = pts.slice(0, i).reverse().find(q => q.y !== null)
    return acc + (prev ? ` L${p.x},${p.y}` : `M${p.x},${p.y}`)
  }, '')

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-4">
        <span className="display italic text-accent text-[26px]">ii.</span>
        <h3 className="mincho text-[20px]">推移</h3>
        <div className="ml-auto flex items-baseline gap-3 mincho text-[12px]">
          <span className="mono text-[10px] text-muted tracking-wider2">表示期間</span>
          {[14, 30, 90].map(r => (
            <button
              key={r}
              onClick={() => setRange(r as 14|30|90)}
              className={`${range === r ? 'text-accent' : 'text-muted hover:text-ink'}`}
            >{r}日間</button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex gap-3 flex-wrap mb-3">
          {trackedNames.map(n => (
            <button
              key={n}
              onClick={() => setActive(n)}
              className={`mono text-[10px] tracking-wider2 px-2 py-1 border ${selected === n ? 'border-accent text-accent' : 'border-[var(--line)] text-muted'}`}
            >{n}</button>
          ))}
          {trackedNames.length === 0 && (
            <div className="mincho text-[12px] text-muted">追跡する症状が未設定です</div>
          )}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* gridlines */}
          {[0, 2.5, 5, 7.5, 10].map(v => {
            const y = PAD_T + (1 - v / 10) * innerH
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke="var(--line)" strokeWidth="1"
                  strokeDasharray={v === 0 || v === 10 ? '' : '2 3'} />
                <text x={PAD_L - 6} y={y + 3} fontSize="8" fill="var(--muted)"
                  textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
              </g>
            )
          })}
          {/* path */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1000"
              style={{ animation: 'inkDraw 1200ms ease-out forwards' }}
            />
          )}
          {/* dots */}
          {pts.map((p, i) => p.y !== null && (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="2" fill="var(--accent)" />
            </g>
          ))}
          {/* x labels — start/mid/end */}
          {[0, Math.floor(data.length/2), data.length - 1].map(i => data[i] && (
            <text key={i} x={pts[i].x} y={H - 6} fontSize="8"
              fill="var(--muted)" textAnchor="middle" fontFamily="JetBrains Mono">
              {`${Number(data[i].date.slice(5,7))}月${Number(data[i].date.slice(8,10))}日`}
            </text>
          ))}
        </svg>

        <div className="mono text-[9px] text-muted tracking-wider2 text-center mt-1">
つらさ 0〜10 &nbsp;·&nbsp; 直近 {range} 日間
        </div>
      </div>
    </div>
  )
}
