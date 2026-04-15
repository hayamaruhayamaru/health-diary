import { useMemo, useState } from 'react'
import { useDiary, newId } from '../store/useDiary'
import type { Medication, SymptomDef } from '../types'

type MedSortKey = 'name' | 'time' | 'dose'
type SymSortKey = 'name' | 'unit'
type SortDir = 'asc' | 'desc'

export default function MedMaster() {
  const { state, upsertMed, deleteMed, upsertSymptomDef, deleteSymptomDef } = useDiary()
  const [draft, setDraft] = useState<Medication>({ id: '', name: '', defaultTime: '', dose: '', note: '' })
  const [symDraft, setSymDraft] = useState<SymptomDef>({ id: '', name: '', unit: '', tracked: true })
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Medication>({ id: '', name: '', defaultTime: '', dose: '', note: '' })
  const [medSort, setMedSort] = useState<{ key: MedSortKey, dir: SortDir } | null>(null)

  const [symSort, setSymSort] = useState<{ key: SymSortKey, dir: SortDir } | null>(null)

  const sortedSymptomDefs = useMemo(() => {
    if (!symSort) return state.symptomDefs
    const sign = symSort.dir === 'asc' ? 1 : -1
    const arr = state.symptomDefs.slice()
    arr.sort((a, b) => {
      if (symSort.key === 'name') {
        return a.name.localeCompare(b.name, 'ja') * sign
      }
      const av = a.unit ?? ''
      const bv = b.unit ?? ''
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      return av.localeCompare(bv, 'ja', { numeric: true }) * sign
    })
    return arr
  }, [state.symptomDefs, symSort])

  const sortedMedications = useMemo(() => {
    if (!medSort) return state.medications
    const sign = medSort.dir === 'asc' ? 1 : -1
    const arr = state.medications.slice()
    arr.sort((a, b) => {
      if (medSort.key === 'name') return a.name.localeCompare(b.name, 'ja') * sign
      const av = (medSort.key === 'time' ? a.defaultTime : a.dose) ?? ''
      const bv = (medSort.key === 'time' ? b.defaultTime : b.dose) ?? ''
      if (!av && !bv) return 0
      if (!av) return 1
      if (!bv) return -1
      return av.localeCompare(bv, 'ja', { numeric: true }) * sign
    })
    return arr
  }, [state.medications, medSort])

  const startEdit = (m: Medication) => {
    setEditId(m.id)
    setEditDraft({ ...m })
  }
  const cancelEdit = () => {
    setEditId(null)
    setEditDraft({ id: '', name: '', defaultTime: '', dose: '', note: '' })
  }
  const saveEdit = () => {
    if (!editDraft.name.trim()) return
    upsertMed(editDraft)
    cancelEdit()
  }

  const addMed = () => {
    if (!draft.name.trim()) return
    upsertMed({ ...draft, id: draft.id || newId('m') })
    setDraft({ id: '', name: '', defaultTime: '', dose: '', note: '' })
  }
  const addSym = () => {
    if (!symDraft.name.trim()) return
    upsertSymptomDef({ ...symDraft, id: symDraft.id || newId('s') })
    setSymDraft({ id: '', name: '', unit: '', tracked: true })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Medications */}
      <div className="lg:col-span-7 min-w-0">
        <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
          <span className="display italic text-accent text-[32px]">i.</span>
          <h3 className="mincho text-[24px]">薬マスタ</h3>
          <span className="mono text-[10px] text-muted tracking-wider2 ml-auto">
            {state.medications.length} ITEMS
          </span>
        </div>

        <div className="card mb-6">
          {state.medications.length > 0 && (
            <div className="px-4 pt-4 pb-2 grid grid-cols-12 gap-4 items-center hair-b">
              <div className="col-span-5 eyebrow flex items-center gap-1">
                <span>薬名 / メモ</span>
                <MedSortArrows
                  active={medSort?.key === 'name' ? medSort.dir : null}
                  onAsc={() => setMedSort({ key: 'name', dir: 'asc' })}
                  onDesc={() => setMedSort({ key: 'name', dir: 'desc' })}
                />
              </div>
              <div className="col-span-2 eyebrow flex items-center gap-1">
                <span>時刻</span>
                <MedSortArrows
                  active={medSort?.key === 'time' ? medSort.dir : null}
                  onAsc={() => setMedSort({ key: 'time', dir: 'asc' })}
                  onDesc={() => setMedSort({ key: 'time', dir: 'desc' })}
                />
              </div>
              <div className="col-span-2 eyebrow flex items-center gap-1">
                <span>用量</span>
                <MedSortArrows
                  active={medSort?.key === 'dose' ? medSort.dir : null}
                  onAsc={() => setMedSort({ key: 'dose', dir: 'asc' })}
                  onDesc={() => setMedSort({ key: 'dose', dir: 'desc' })}
                />
              </div>
              <div className="col-span-3 eyebrow text-right">操作</div>
            </div>
          )}
          <div className="divide-y divide-[var(--line)]">
          {sortedMedications.map(m => (
            editId === m.id ? (
              <div key={m.id} className="p-4 grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 sm:col-span-4 min-w-0">
                  <div className="eyebrow mb-1">薬名</div>
                  <input value={editDraft.name}
                    onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} />
                </div>
                <div className="col-span-6 sm:col-span-3 min-w-0">
                  <div className="eyebrow mb-1">時刻</div>
                  <input type="time" value={editDraft.defaultTime || ''}
                    onChange={e => setEditDraft({ ...editDraft, defaultTime: e.target.value })} />
                </div>
                <div className="col-span-6 sm:col-span-3 min-w-0">
                  <div className="eyebrow mb-1">用量</div>
                  <input placeholder="用量 (例: 60mg)" value={editDraft.dose || ''}
                    onChange={e => setEditDraft({ ...editDraft, dose: e.target.value })} />
                </div>
                <div className="col-span-12 sm:col-span-2 min-w-0 flex flex-col gap-2">
                  <button className="btn btn-accent w-full justify-center" onClick={saveEdit}>保存</button>
                  <button className="btn btn-ghost w-full justify-center" onClick={cancelEdit}>取消</button>
                </div>
                <div className="col-span-12 min-w-0">
                  <div className="eyebrow mb-1">メモ</div>
                  <input placeholder="メモ（任意）" value={editDraft.note || ''}
                    onChange={e => setEditDraft({ ...editDraft, note: e.target.value })} />
                </div>
              </div>
            ) : (
              <div key={m.id} className="p-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5">
                  <div className="mincho text-[17px]">{m.name}</div>
                  {m.note && <div className="mono text-[10px] text-muted tracking-wider2 mt-1">{m.note}</div>}
                </div>
                <div className="col-span-2 mono text-[11px] text-muted">{m.defaultTime || '—'}</div>
                <div className="col-span-2 mono text-[11px] text-muted">{m.dose || '—'}</div>
                <button
                  onClick={() => startEdit(m)}
                  className="col-span-2 mincho text-[12px] text-muted hover:text-accent text-right"
                  title="編集"
                >編集</button>
                <button
                  onClick={() => { if (confirm(`${m.name} を削除しますか？`)) deleteMed(m.id) }}
                  className="col-span-1 mincho text-[12px] text-muted hover:text-accent transition text-right"
                  title="削除"
                >削除</button>
              </div>
            )
          ))}
          {state.medications.length === 0 && (
            <div className="p-4 mincho text-[13px] text-muted">登録なし</div>
          )}
          </div>
        </div>

        <div className="card p-5">
          <div className="eyebrow mb-4">+ 新規登録</div>
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-4">
            <div className="col-span-2 sm:col-span-4 min-w-0">
              <input placeholder="薬名" value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="col-span-1 sm:col-span-3 min-w-0">
              <input type="time" value={draft.defaultTime || ''}
                onChange={e => setDraft({ ...draft, defaultTime: e.target.value })} />
            </div>
            <div className="col-span-1 sm:col-span-3 min-w-0">
              <input placeholder="用量 (例: 60mg)" value={draft.dose || ''}
                onChange={e => setDraft({ ...draft, dose: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-2 min-w-0">
              <button className="btn btn-accent w-full justify-center" onClick={addMed}>追加</button>
            </div>
            <div className="col-span-2 sm:col-span-12 min-w-0">
              <input placeholder="メモ（任意）" value={draft.note || ''}
                onChange={e => setDraft({ ...draft, note: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Symptom definitions */}
      <div className="lg:col-span-5 min-w-0">
        <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
          <span className="display italic text-accent text-[32px]">ii.</span>
          <h3 className="mincho text-[24px]">症状定義</h3>
        </div>
        <div className="card mb-6">
          {state.symptomDefs.length > 0 && (
            <div className="px-4 pt-4 pb-2 flex items-center gap-4 hair-b">
              <div className="w-5 shrink-0" />
              <div className="eyebrow flex-1 flex items-center gap-1">
                <span>症状名</span>
                <MedSortArrows
                  active={symSort?.key === 'name' ? symSort.dir : null}
                  onAsc={() => setSymSort({ key: 'name', dir: 'asc' })}
                  onDesc={() => setSymSort({ key: 'name', dir: 'desc' })}
                />
              </div>
              <div className="eyebrow w-[80px] flex items-center justify-end gap-1">
                <span>単位</span>
                <MedSortArrows
                  active={symSort?.key === 'unit' ? symSort.dir : null}
                  onAsc={() => setSymSort({ key: 'unit', dir: 'asc' })}
                  onDesc={() => setSymSort({ key: 'unit', dir: 'desc' })}
                />
              </div>
              <div className="eyebrow w-[40px] text-right">操作</div>
            </div>
          )}
          <div className="divide-y divide-[var(--line)]">
            {sortedSymptomDefs.map(s => (
              <div key={s.id} className="p-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  className="chk shrink-0"
                  checked={s.tracked}
                  onChange={e => upsertSymptomDef({ ...s, tracked: e.target.checked })}
                />
                <div className="flex-1 min-w-0 mincho text-[15px] truncate">{s.name}</div>
                <div className="w-[80px] mono text-[11px] text-muted text-right truncate">{s.unit || '—'}</div>
                <button
                  onClick={() => { if (confirm(`${s.name} を削除しますか？`)) deleteSymptomDef(s.id) }}
                  className="w-[40px] mincho text-[12px] text-muted hover:text-accent transition text-right shrink-0"
                  title="削除"
                >削除</button>
              </div>
            ))}
            {state.symptomDefs.length === 0 && (
              <div className="p-4 mincho text-[13px] text-muted">登録なし</div>
            )}
          </div>
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-4">+ 新規登録</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-7 min-w-0">
              <input placeholder="症状名" value={symDraft.name}
                onChange={e => setSymDraft({ ...symDraft, name: e.target.value })} />
            </div>
            <div className="col-span-7 sm:col-span-3 min-w-0">
              <input placeholder="単位" value={symDraft.unit || ''}
                onChange={e => setSymDraft({ ...symDraft, unit: e.target.value })} />
            </div>
            <div className="col-span-5 sm:col-span-2 min-w-0">
              <button className="btn btn-accent w-full justify-center" onClick={addSym}>追加</button>
            </div>
          </div>
          <ul className="mincho text-[12px] text-muted leading-relaxed list-disc pl-5 mt-4 space-y-1">
            <li><span className="text-accent">単位</span>は実測値を記録するときの単位です（例：体温 → <span className="mono text-[11px]">℃</span>、血圧 → <span className="mono text-[11px]">mmHg</span>、体重 → <span className="mono text-[11px]">kg</span>）。</li>
            <li>計測値がない症状（頭痛・倦怠感など）は<span className="text-accent">空欄</span>で構いません。</li>
            <li>チェックの付いた症状は「02・履歴」タブの推移グラフに表示されます。</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function MedSortArrows({
  active, onAsc, onDesc
}: {
  active: SortDir | null
  onAsc: () => void
  onDesc: () => void
}) {
  return (
    <span className="inline-flex flex-row items-center gap-1 leading-none ml-1">
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onAsc() }}
        className={`mono text-[11px] leading-none transition ${active === 'asc' ? 'text-accent' : 'text-muted hover:text-accent'}`}
        title="昇順で並び替え"
      >
        A↓
      </button>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onDesc() }}
        className={`mono text-[11px] leading-none transition ${active === 'desc' ? 'text-accent' : 'text-muted hover:text-accent'}`}
        title="降順で並び替え"
      >
        Z↑
      </button>
    </span>
  )
}
