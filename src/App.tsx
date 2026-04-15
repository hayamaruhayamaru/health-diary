import { useMemo, useState } from 'react'
import { useDiary, todayStr } from './store/useDiary'
import EntryForm from './components/EntryForm'
import CalendarView from './components/CalendarView'
import ListView from './components/ListView'
import TrendChart from './components/TrendChart'
import MedMaster from './components/MedMaster'
import ImportExport from './components/ImportExport'

type Tab = 'record' | 'history' | 'meds' | 'io'

const TABS: { id: Tab; num: string; label: string }[] = [
  { id: 'record',  num: '01', label: '記録'   },
  { id: 'history', num: '02', label: '履歴'   },
  { id: 'meds',    num: '03', label: '薬'     },
  { id: 'io',      num: '04', label: '入出力' }
]

export default function App() {
  const [tab, setTab] = useState<Tab>('record')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const { state } = useDiary()

  const stats = useMemo(() => {
    const dates = Object.keys(state.entries).sort()
    const total = dates.length
    const last = dates[dates.length - 1] ?? '—'
    return { total, last }
  }, [state.entries])

  const now = new Date()
  const dateLabel = `${now.getFullYear()}年 ${now.getMonth() + 1}月 ${now.getDate()}日`
  const weekdayJP = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()]

  return (
    <div className="min-h-screen">
      {/* ───────── Header ───────── */}
      <header className="max-w-[1240px] mx-auto px-10 pt-10 pb-6 rise">
        <div className="grid grid-cols-12 gap-6 items-end hair-b pb-6">
          <div className="col-span-7">
            <h1 className="display text-[84px] leading-[0.86] tracking-tight">
              健康記録
            </h1>
            <p className="display italic text-[32px] leading-none mt-2 text-muted">
              a quiet daily record
            </p>
          </div>
          <div className="col-span-5 flex justify-end">
            <div className="text-right">
              <div className="eyebrow mb-2">Today</div>
              <div className="mincho text-[22px] leading-tight">{dateLabel}</div>
              <div className="mono text-[11px] text-muted mt-1 tracking-wider2">
                {weekdayJP}曜日 &nbsp;·&nbsp; {now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
              </div>
              <div className="mt-4 flex justify-end gap-6">
                <Stat num={stats.total} label="ENTRIES" />
                <Stat num={stats.last === '—' ? '—' : `${Number(stats.last.slice(5,7))}月${Number(stats.last.slice(8,10))}日`} label="LATEST" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── Nav ───────── */}
      <nav className="max-w-[1240px] mx-auto px-10 mb-10 rise rise-1">
        <div className="flex items-center justify-between hair-b pb-0">
          <div className="flex gap-10">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span className="mono mr-2 text-accent">{t.num}</span>
                · {t.label}
              </button>
            ))}
          </div>
          <div className="mincho text-[12px] text-muted leading-relaxed text-right">
            <div className="inline-block text-left">
              <div>データはこの端末のブラウザ内にのみ保存されます</div>
              <div>詳細は「04・入出力」の「データの取り扱いについて」をご参照ください</div>
            </div>
          </div>
        </div>
      </nav>

      {/* ───────── Main ───────── */}
      <main className="max-w-[1240px] mx-auto px-10 pb-24 rise rise-2">
        {tab === 'record'  && <EntryForm date={selectedDate} setDate={setSelectedDate} />}
        {tab === 'history' && (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-7"><CalendarView onPick={(d) => { setSelectedDate(d); setTab('record') }} /></div>
            <div className="col-span-5 space-y-8">
              <TrendChart />
              <ListView onEdit={(d) => { setSelectedDate(d); setTab('record') }} />
            </div>
          </div>
        )}
        {tab === 'meds' && <MedMaster />}
        {tab === 'io'   && <ImportExport />}
      </main>

      {/* ───────── Footer ───────── */}
      <footer className="max-w-[1240px] mx-auto px-10 pb-10 hair-t pt-6">
        <div className="flex justify-between items-center">
          <div className="mono text-[10px] text-muted tracking-wider2">
            FIGURE I.  &nbsp;—&nbsp;  daily constitution, charted by the hand of its keeper.
          </div>
          <div className="display italic text-[18px] text-muted">ver. 0.1 — folio unum</div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ num, label }: { num: number | string, label: string }) {
  return (
    <div className="text-right">
      <div className="mincho text-[24px] leading-none">{num}</div>
      <div className="mono text-[9px] text-muted tracking-wider2 mt-1">{label}</div>
    </div>
  )
}
