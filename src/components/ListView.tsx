import { useMemo } from 'react'
import { useDiary } from '../store/useDiary'

type Props = { onEdit: (date: string) => void }

export default function ListView({ onEdit }: Props) {
  const { state } = useDiary()

  const rows = useMemo(() => {
    return Object.values(state.entries)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12)
  }, [state.entries])

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-4">
        <span className="display italic text-accent text-[26px]">iii.</span>
        <h3 className="mincho text-[20px]">最近の記録</h3>
        <span className="mono text-[10px] text-muted tracking-wider2 ml-auto">LAST {rows.length}</span>
      </div>
      <div className="card divide-y divide-[var(--line)]">
        {rows.length === 0 && (
          <div className="p-6 mincho text-[13px] text-muted">まだ記録がありません。</div>
        )}
        {rows.map(e => {
          const maxLvl = Math.max(0, ...e.symptoms.map(s => s.level))
          const takenCount = e.meds.filter(m => m.taken).length
          return (
            <button
              key={e.date}
              onClick={() => onEdit(e.date)}
              className="w-full text-left p-4 hover:bg-[var(--accent-soft)] transition group"
            >
              <div className="flex items-baseline gap-4">
                <div className="mono text-[13px] text-accent w-[90px]">{`${Number(e.date.slice(5,7))}月${Number(e.date.slice(8,10))}日`}</div>
                <div className="mincho text-[13px] text-muted w-[50px]">{e.date.slice(0,4)}</div>
                <div className="flex-1 mincho text-[13px] truncate">
                  {e.note || <span className="text-muted italic">（備考なし）</span>}
                </div>
                <div className="mono text-[10px] text-muted tracking-wider2">
                  症状 {maxLvl}/10 · 服薬 {takenCount}/{e.meds.length}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
