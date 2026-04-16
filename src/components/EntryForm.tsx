import { useEffect, useMemo, useState } from 'react'
import { useDiary, newId } from '../store/useDiary'
import type { Entry, MedRecord, Medication, SymptomDef, SymptomRecord } from '../types'

type Props = {
  date: string
  setDate: (d: string) => void
}

export default function EntryForm({ date, setDate }: Props) {
  const { state, upsertEntry, deleteEntry } = useDiary()
  const existing = state.entries[date]

  const [symptoms, setSymptoms] = useState<SymptomRecord[]>([])
  const [meds, setMeds] = useState<MedRecord[]>([])
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setSymptoms(existing.symptoms)
      setMeds(existing.meds)
      setNote(existing.note)
    } else {
      setSymptoms(state.symptomDefs.map(d => ({
        id: newId('sym'), name: d.name, level: 0, unit: d.unit, value: undefined
      })))
      setMeds(state.medications.map(m => ({
        medId: m.id, name: m.name, time: m.defaultTime, dose: m.dose, taken: false
      })))
      setNote('')
    }
  }, [date]) // eslint-disable-line

  const save = () => {
    const entry: Entry = { date, symptoms, meds, note, updatedAt: Date.now() }
    upsertEntry(entry)
    setToast('記録しました')
    setTimeout(() => setToast(null), 1800)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // 毎レンダーで最新の symptoms/meds/note を参照するため依存配列なし

  const remove = () => {
    if (!existing) return
    if (!confirm(`${date} の記録を削除しますか？`)) return
    deleteEntry(date)
    setToast('削除しました')
    setTimeout(() => setToast(null), 1800)
  }

  const prevEntryDate = useMemo(() => {
    const dates = Object.keys(state.entries).filter(d => d < date).sort()
    return dates.length > 0 ? dates[dates.length - 1] : null
  }, [state.entries, date])

  const copyFromPrev = () => {
    if (!prevEntryDate) return
    const prev = state.entries[prevEntryDate]
    if (!prev) return
    const hasInput =
      symptoms.some(s => s.level > 0 || (s.value !== undefined && s.value !== null)) ||
      meds.some(m => m.taken) ||
      note.trim().length > 0
    if (hasInput && !confirm(`現在の入力内容を ${prevEntryDate} の記録で上書きしますか？`)) return
    setSymptoms(prev.symptoms.map(s => ({ ...s, id: newId('sym') })))
    setMeds(prev.meds.map(m => ({ ...m })))
    setNote(prev.note)
    setToast(`${prevEntryDate} の記録をコピーしました`)
    setTimeout(() => setToast(null), 1800)
  }

  const weekday = useMemo(() => {
    const d = new Date(date)
    return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  }, [date])

  const missingDefs = useMemo<SymptomDef[]>(
    () => state.symptomDefs.filter(d => !symptoms.some(s => s.name === d.name)),
    [state.symptomDefs, symptoms]
  )

  const prevLevelByName = useMemo(() => {
    const dates = Object.keys(state.entries).filter(d => d < date).sort().reverse()
    const map = new Map<string, { level: number, date: string }>()
    for (const d of dates) {
      const e = state.entries[d]
      if (!e) continue
      for (const s of e.symptoms) {
        if (s.name && !map.has(s.name)) {
          map.set(s.name, { level: s.level, date: d })
        }
      }
    }
    return map
  }, [state.entries, date])

  const addFromDef = (def: SymptomDef) => {
    setSymptoms(prev => [
      ...prev,
      { id: newId('sym'), name: def.name, level: 0, unit: def.unit, value: undefined }
    ])
  }

  const addAllMissing = () => {
    if (missingDefs.length === 0) return
    setSymptoms(prev => [
      ...prev,
      ...missingDefs.map(d => ({
        id: newId('sym'), name: d.name, level: 0, unit: d.unit, value: undefined
      }))
    ])
  }

  const missingMeds = useMemo<Medication[]>(
    () => state.medications.filter(med => !meds.some(m => m.medId === med.id)),
    [state.medications, meds]
  )

  const missingMedsByName = useMemo(() => {
    const map = new Map<string, Medication[]>()
    for (const med of missingMeds) {
      if (!map.has(med.name)) map.set(med.name, [])
      map.get(med.name)!.push(med)
    }
    return Array.from(map.entries())
  }, [missingMeds])

  const addMedsByName = (variants: Medication[]) => {
    setMeds(prev => [
      ...prev,
      ...variants.map(med => ({
        medId: med.id, name: med.name, time: med.defaultTime, dose: med.dose, taken: false
      }))
    ])
  }

  const addMedFromMaster = (med: Medication) => {
    setMeds(prev => [
      ...prev,
      { medId: med.id, name: med.name, time: med.defaultTime, dose: med.dose, taken: false }
    ])
  }

  const addAllMissingMeds = () => {
    if (missingMeds.length === 0) return
    setMeds(prev => [
      ...prev,
      ...missingMeds.map(med => ({
        medId: med.id, name: med.name, time: med.defaultTime, dose: med.dose, taken: false
      }))
    ])
  }

  const sortSymptoms = (key: 'name' | 'level' | 'value', dir: 'asc' | 'desc') => {
    setSymptoms(prev => {
      const next = prev.slice()
      const sign = dir === 'asc' ? 1 : -1
      next.sort((a, b) => {
        if (key === 'name') return a.name.localeCompare(b.name, 'ja') * sign
        if (key === 'level') return (a.level - b.level) * sign
        const av = a.value ?? Number.POSITIVE_INFINITY
        const bv = b.value ?? Number.POSITIVE_INFINITY
        return (av - bv) * sign
      })
      return next
    })
  }

  const sortMeds = (key: 'taken' | 'name' | 'time', dir: 'asc' | 'desc') => {
    setMeds(prev => {
      const next = prev.slice()
      const sign = dir === 'asc' ? 1 : -1
      next.sort((a, b) => {
        if (key === 'taken') return ((a.taken ? 1 : 0) - (b.taken ? 1 : 0)) * sign
        if (key === 'name') return a.name.localeCompare(b.name, 'ja') * sign
        const at = a.time ?? '\uFFFF'
        const bt = b.time ?? '\uFFFF'
        return at.localeCompare(bt) * sign
      })
      return next
    })
  }

  const addAdhocMed = () => {
    const name = window.prompt('この日のみ追加する薬の名称を入力してください')
    if (!name || !name.trim()) return
    setMeds(prev => [
      ...prev,
      { medId: newId('adhoc'), name: name.trim(), time: undefined, dose: undefined, taken: false }
    ])
  }

  return (
    <div className="grid grid-cols-12 gap-10">
      {/* Left rail — date */}
      <aside className="col-span-3 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pr-2">
        <div className="flex items-baseline gap-3 mb-4 hair-b pb-3">
          <span className="display italic text-accent text-[26px] leading-none">i.</span>
          <h3 className="mincho text-[20px]">記録日選択</h3>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="date-icon-only ml-auto self-center"
            title="記録日を選択"
          />
        </div>
        <div className="pb-4 mb-4">
          <div className="mincho text-[20px]">{`${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日`}</div>
          <div className="mincho text-[20px] mt-1">{date.slice(0, 4)}年 · {weekday}曜日</div>
        </div>

        <div className="mt-8">
          <div className="eyebrow mb-3">本WEBサイトの目的</div>
          <ol className="mincho text-[13px] leading-relaxed text-muted list-decimal pl-5 space-y-1">
            <li>一日の症状程度、服薬時間、気づいたことを記録する。</li>
            <li>先生との診察時に記録した内容を共有する。</li>
          </ol>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button className="btn btn-accent" onClick={save}>記録を保存</button>
          <div className="mono text-[9px] text-muted tracking-wider2 text-center">
            Ctrl / ⌘ + S でも保存できます
          </div>
          <button
            className="btn btn-ghost"
            onClick={copyFromPrev}
            disabled={!prevEntryDate}
            title={prevEntryDate ? `${prevEntryDate} の症状・服薬・備考をコピー` : '前の記録がありません'}
          >
            前日の記録をコピー
          </button>
          {prevEntryDate && (
            <div className="mono text-[9px] text-muted tracking-wider2 text-center">
              直近: {prevEntryDate}
            </div>
          )}
          {existing && (
            <button className="btn btn-ghost" onClick={remove}>この日を削除</button>
          )}
          {toast && (
            <div className="mono text-[10px] tracking-wider2 text-accent mt-2">— {toast}</div>
          )}
        </div>
      </aside>

      {/* Main — form */}
      <section className="col-span-9 space-y-12">
        {/* Symptoms */}
        <div>
          <SectionHead num="ii." title="症状記録" sub="つらさの程度と実測値を書き留める" />
          <div className="card p-6 space-y-5">
            <ul className="mincho text-[12px] text-muted leading-relaxed list-disc pl-5 space-y-1">
              <li><span className="text-accent">つらさ</span>はスライダーで 0〜10 の主観評価（0 = なし、10 = 最大）。</li>
              <li><span className="text-accent">実測値</span>は体温などの計測値を単位とあわせて記入します（例：体温 36.5 ℃）。</li>
              <li>計測値がない症状は実測値は空欄で構いません。</li>
              <li>「03 · 薬」タブの「症状定義」で<span className="text-accent">追跡対象</span>に設定した症状は、ここで入力した<span className="text-accent">つらさ</span>が「02 · 履歴」タブの推移グラフに反映されます。</li>
              <li>
                <span className="text-accent">つらさの目安</span>：
                <span className="mono text-[11px]"> 3</span> = 気にならない程度 /
                <span className="mono text-[11px]"> 5</span> = 作業に集中しづらい /
                <span className="mono text-[11px]"> 7</span> = 横になりたい
              </li>
              <li>各行には<span className="text-accent">直近の記録値</span>を表示します。「前回と同じ／少し軽い」で相対的に判断できます。</li>
            </ul>
            <div className="grid grid-cols-12 gap-4 items-center hair-b pb-2">
              <div className="col-span-3 eyebrow flex items-center gap-1">
                <span>症状名</span>
                <SortArrows onAsc={() => sortSymptoms('name', 'asc')} onDesc={() => sortSymptoms('name', 'desc')} />
              </div>
              <div className="col-span-5 eyebrow flex items-center gap-1">
                <span>つらさ（0〜10）</span>
                <SortArrows onAsc={() => sortSymptoms('level', 'asc')} onDesc={() => sortSymptoms('level', 'desc')} />
              </div>
              <div className="col-span-3 eyebrow flex items-center gap-2">
                <span className="flex-1 flex items-center gap-1">
                  <span>実測値</span>
                  <SortArrows onAsc={() => sortSymptoms('value', 'asc')} onDesc={() => sortSymptoms('value', 'desc')} />
                </span>
                <span className="w-14">単位</span>
              </div>
              <div className="col-span-1 eyebrow text-right">操作</div>
            </div>
            {symptoms.map((s, i) => (
              <SymptomRow
                key={s.id}
                s={s}
                prev={s.name ? prevLevelByName.get(s.name) : undefined}
                onChange={v => setSymptoms(prev => prev.map((x, ix) => ix === i ? v : x))}
                onRemove={() => setSymptoms(prev => prev.filter((_, ix) => ix !== i))}
              />
            ))}
            <button
              className="mono text-[11px] tracking-wider2 text-muted hover:text-accent transition"
              onClick={() => setSymptoms(prev => [...prev, { id: newId('sym'), name: '', level: 0 }])}
            >
              + 症状を追加
            </button>
            {missingDefs.length > 0 && (
              <div className="hair-t pt-3 mt-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="mono text-[10px] text-muted tracking-wider2">症状定義にあるが未追加:</div>
                  {missingDefs.map(d => (
                    <button
                      key={d.id}
                      onClick={() => addFromDef(d)}
                      className="mono text-[10px] tracking-wider2 px-2 py-1 border border-[var(--line)] text-muted hover:border-accent hover:text-accent transition"
                      title="クリックで追加"
                    >
                      + {d.name}
                    </button>
                  ))}
                  <button
                    onClick={addAllMissing}
                    className="mono text-[10px] tracking-wider2 text-muted hover:text-accent ml-auto"
                    title="未追加の症状定義をまとめて追加"
                  >
                    すべて追加
                  </button>
                </div>
                <div className="mono text-[9px] text-muted tracking-wider2 mt-2">
                  ※ 追加しても「記録を保存」を押すまでは保存されません。
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medications */}
        <div>
          <SectionHead num="iii." title="服薬記録" sub="飲んだらチェック" />
          <div className="card p-6">
            {meds.length === 0 && (
              <div className="mincho text-[13px] text-muted">
                薬マスタが空です。「03 · 薬」タブから登録できます。
              </div>
            )}
            {meds.length > 0 && (
              <div className="flex items-center gap-5 hair-b pb-2 mb-1">
                <div className="eyebrow w-[88px] text-center whitespace-nowrap flex items-center justify-center gap-1">
                  <span>服用</span>
                  <SortArrows onAsc={() => sortMeds('taken', 'asc')} onDesc={() => sortMeds('taken', 'desc')} />
                </div>
                <div className="eyebrow flex-1 flex items-center gap-1">
                  <span>薬名 / 用量</span>
                  <SortArrows onAsc={() => sortMeds('name', 'asc')} onDesc={() => sortMeds('name', 'desc')} />
                </div>
                <div className="eyebrow w-[90px] flex items-center gap-1">
                  <span>時刻</span>
                  <SortArrows onAsc={() => sortMeds('time', 'asc')} onDesc={() => sortMeds('time', 'desc')} />
                </div>
                <div className="eyebrow w-[64px] text-center whitespace-nowrap">時刻クリア</div>
                <div className="eyebrow w-[72px] text-right">状態</div>
                <div className="w-[40px]" />
              </div>
            )}
            <div className="divide-y divide-[var(--line)]">
              {meds.map((m, i) => (
                <label key={m.medId + i} className="flex items-center gap-5 py-3 cursor-pointer group">
                  <div className="w-[88px] flex justify-center">
                    <input
                      type="checkbox"
                      className="chk"
                      checked={m.taken}
                      onChange={e => setMeds(prev => prev.map((x, ix) => ix === i ? { ...x, taken: e.target.checked } : x))}
                    />
                  </div>
                  <div className="flex-1 flex items-baseline gap-4">
                    <span className={`mincho text-[17px] ${m.taken ? '' : 'text-muted'}`}>{m.name}</span>
                    {m.dose && <span className="mono text-[11px] text-muted">{m.dose}</span>}
                  </div>
                  <input
                    type="time"
                    value={m.time ?? ''}
                    onChange={e => setMeds(prev => prev.map((x, ix) => ix === i ? { ...x, time: e.target.value } : x))}
                    className="!w-[90px] !border-0"
                  />
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMeds(prev => prev.map((x, ix) => ix === i ? { ...x, time: undefined } : x))
                    }}
                    disabled={!m.time}
                    title="時刻をクリア"
                    className="mono text-[10px] text-muted hover:text-accent disabled:opacity-30 disabled:hover:text-muted tracking-wider2 w-[64px] text-center shrink-0"
                  >
                    ✕
                  </button>
                  <span className={`mono text-[10px] tracking-wider2 w-[72px] text-right shrink-0 ${m.taken ? 'text-accent' : 'text-muted'}`}>
                    {m.taken ? '✓ TAKEN' : '○ PENDING'}
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMeds(prev => prev.filter((_, ix) => ix !== i))
                    }}
                    title="この行を削除"
                    className="mincho text-[12px] text-muted hover:text-accent transition w-[40px] text-right shrink-0"
                  >
                    削除
                  </button>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <button
                className="mono text-[11px] tracking-wider2 text-muted hover:text-accent transition"
                onClick={addAdhocMed}
              >
                + 薬を追加（この日のみ）
              </button>
            </div>
            {missingMeds.length > 0 && (
              <div className="hair-t pt-3 mt-3">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="mono text-[10px] text-muted tracking-wider2">薬マスタにあるが未追加:</div>
                  <button
                    onClick={addAllMissingMeds}
                    className="mono text-[10px] tracking-wider2 text-muted hover:text-accent"
                    title="未追加の薬マスタをまとめて追加"
                  >
                    すべて追加
                  </button>
                </div>
                <div className="space-y-2">
                  {missingMedsByName.map(([name, variants]) => (
                    <div key={name} className="flex items-baseline gap-3 flex-wrap">
                      <div className="mincho text-[13px] w-[120px] shrink-0 truncate" title={name}>{name}</div>
                      <div className="flex items-baseline gap-2 flex-wrap flex-1">
                        {variants.map(med => {
                          const meta = [med.dose, med.defaultTime].filter(Boolean).join(' · ') || '—'
                          return (
                            <button
                              key={med.id}
                              onClick={() => addMedFromMaster(med)}
                              className="mono text-[10px] tracking-wider2 px-2 py-1 border border-[var(--line)] text-muted hover:border-accent hover:text-accent transition"
                              title="クリックで追加"
                            >
                              + {meta}
                            </button>
                          )
                        })}
                        {variants.length > 1 && (
                          <button
                            onClick={() => addMedsByName(variants)}
                            className="mono text-[10px] tracking-wider2 text-muted hover:text-accent ml-1"
                            title={`${name} の全ての時刻/用量を追加`}
                          >
                            全部
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mono text-[9px] text-muted tracking-wider2 mt-3">
                  ※ 追加しても「記録を保存」を押すまでは保存されません。
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        <div>
          <SectionHead num="iv." title="備考" sub="気づいたこと・体調の変化" />
          <div className="card p-6">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="今日の気づき、食事、睡眠、天気、その他..."
              className="!border-none min-h-[140px] mincho text-[15px] leading-relaxed"
              style={{ borderBottom: 'none' }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function SortArrows({ onAsc, onDesc }: { onAsc: () => void, onDesc: () => void }) {
  return (
    <span className="inline-flex flex-row items-center gap-1 leading-none ml-1">
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onAsc() }}
        className="mono text-[11px] text-muted hover:text-accent leading-none"
        title="昇順で並び替え"
      >
        A↓
      </button>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onDesc() }}
        className="mono text-[11px] text-muted hover:text-accent leading-none"
        title="降順で並び替え"
      >
        Z↑
      </button>
    </span>
  )
}

function SectionHead({ num, title, sub }: { num: string, title: string, sub: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-4">
        <span className="display italic text-accent text-[26px]">{num}</span>
        <h3 className="mincho text-[20px]">{title}</h3>
      </div>
      <div className="mincho text-[12px] text-muted mt-1 ml-[42px]">{sub}</div>
    </div>
  )
}

function SymptomRow({ s, prev, onChange, onRemove }: {
  s: SymptomRecord
  prev?: { level: number, date: string }
  onChange: (v: SymptomRecord) => void
  onRemove: () => void
}) {
  const prevLabel = prev ? `${Number(prev.date.slice(5,7))}/${Number(prev.date.slice(8,10))}` : ''
  const diff = prev ? s.level - prev.level : 0
  const diffLabel = !prev ? '' : diff === 0 ? '前回と同じ' : diff > 0 ? `+${diff}` : `${diff}`
  return (
    <div className="grid grid-cols-12 gap-4 items-center">
      <input
        className="col-span-3 mincho text-[15px]"
        placeholder="症状名"
        value={s.name}
        onChange={e => onChange({ ...s, name: e.target.value })}
      />
      <div className="col-span-5">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0} max={10} step={1}
            value={s.level}
            onChange={e => onChange({ ...s, level: Number(e.target.value) })}
          />
          <span className="mono text-[13px] w-8 text-right text-accent">{s.level}</span>
          <span className="mono text-[9px] text-muted tracking-wider2">/ 10</span>
        </div>
        {prev && (
          <div className="mono text-[10px] text-muted tracking-wider2 mt-1 pl-[2px]">
            前回: <span className="text-accent">{prev.level}</span>
            <span className="opacity-60"> ({prevLabel})</span>
            <span className="ml-2">{diffLabel}</span>
          </div>
        )}
      </div>
      <div className="col-span-3 flex items-center gap-2">
        <input
          type="number"
          placeholder="実測値"
          title="体温などの計測値。つらさの程度とは別に記録します。"
          value={s.value ?? ''}
          onChange={e => onChange({ ...s, value: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="flex-1"
        />
        <input
          type="text"
          placeholder="単位"
          value={s.unit ?? ''}
          onChange={e => onChange({ ...s, unit: e.target.value })}
          className="!w-14 mono text-[11px]"
        />
      </div>
      <button
        onClick={onRemove}
        className="col-span-1 mincho text-[12px] text-muted hover:text-accent transition text-right"
        title="削除"
      >
        削除
      </button>
    </div>
  )
}
