import { useMemo, useState } from 'react'
import { useDiary } from '../store/useDiary'

type Props = { onPick: (date: string) => void }

export default function CalendarView({ onPick }: Props) {
  const { state } = useDiary()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const arr: ({ d: number; date: string } | null)[] = []
    for (let i = 0; i < startDay; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      arr.push({ d, date })
    }
    return arr
  }, [cursor])

  const prev = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })
  const next = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })

  const jpMonth = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走']

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
        <span className="display italic text-accent text-[26px]">i.</span>
        <h3 className="mincho text-[20px]">履歴</h3>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={prev} className="mono text-[11px] text-muted hover:text-accent tracking-wider2">← PREV</button>
          <div className="text-center">
            <div className="display text-[42px] leading-none">{cursor.m + 1}月</div>
            <div className="mono text-[10px] text-muted tracking-wider2 mt-1">{cursor.y}年 · {jpMonth[cursor.m]}</div>
          </div>
          <button onClick={next} className="mono text-[11px] text-muted hover:text-accent tracking-wider2">NEXT →</button>
        </div>
      </div>

      <div className="card p-6">
        <ul className="mincho text-[12px] text-muted leading-relaxed list-disc pl-5 space-y-1 mb-4">
          <li>セルをクリックするとその日の記録画面に移動します。</li>
          <li>セル右上の<span className="text-accent">赤い点</span>は、その日に記録があることを示します。</li>
          <li>セル下の<span className="text-accent">赤い横線</span>は、その日のつらさの最大値（0〜10）を表し、線が濃いほど強い症状があったことを示します。</li>
        </ul>
        <div className="grid grid-cols-7 gap-0 mb-2 hair-b pb-2">
          {['日','月','火','水','木','金','土'].map((w, i) => (
            <div key={w} className={`mono text-[10px] tracking-wider2 text-center ${i === 0 ? 'text-accent' : 'text-muted'}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[1px] bg-[var(--line)]">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="aspect-square bg-[var(--surface)]" />
            const entry = state.entries[c.date]
            const hasEntry = !!entry
            const maxLevel = entry ? Math.max(0, ...entry.symptoms.map(s => s.level)) : 0
            const intensity = maxLevel / 10
            return (
              <button
                key={i}
                onClick={() => onPick(c.date)}
                className="aspect-square bg-[var(--surface)] relative group hover:bg-[var(--accent-soft)] transition"
              >
                <div className="absolute top-2 left-2 mono text-[11px]">{c.d}</div>
                {hasEntry && (
                  <>
                    <div
                      className="absolute bottom-2 left-2 right-2 h-[2px] bg-accent"
                      style={{ opacity: 0.3 + intensity * 0.7 }}
                    />
                    <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-accent" />
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-6 mt-5 pt-4 hair-t">
          <div className="mono text-[10px] text-muted tracking-wider2">LEGEND</div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-accent"></div>
            <span className="mono text-[10px] text-muted">記録あり</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] bg-accent"></div>
            <span className="mono text-[10px] text-muted">症状の強さ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
