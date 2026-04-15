import { useCallback, useEffect, useState } from 'react'
import type { DiaryState, Entry, Medication, SymptomDef } from '../types'

const KEY = 'health-diary-v1'

const defaultState: DiaryState = {
  entries: {},
  medications: [
    { id: 'm1', name: 'ロキソニン', defaultTime: '08:00', dose: '60mg' },
    { id: 'm2', name: 'ビオフェルミン', defaultTime: '12:00', dose: '1錠' }
  ],
  symptomDefs: [
    { id: 's1', name: '頭痛', tracked: true },
    { id: 's2', name: '倦怠感', tracked: true },
    { id: 's3', name: '体温', unit: '℃', tracked: true }
  ]
}

function load(): DiaryState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as DiaryState
    return {
      entries: parsed.entries ?? {},
      medications: parsed.medications ?? defaultState.medications,
      symptomDefs: parsed.symptomDefs ?? defaultState.symptomDefs
    }
  } catch {
    return defaultState
  }
}

let memState: DiaryState = load()
const listeners = new Set<() => void>()
function persist() {
  localStorage.setItem(KEY, JSON.stringify(memState))
  listeners.forEach(fn => fn())
}

export function useDiary() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force(x => x + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const state = memState

  const upsertEntry = useCallback((entry: Entry) => {
    memState = {
      ...memState,
      entries: { ...memState.entries, [entry.date]: { ...entry, updatedAt: Date.now() } }
    }
    persist()
  }, [])

  const deleteEntry = useCallback((date: string) => {
    const { [date]: _, ...rest } = memState.entries
    memState = { ...memState, entries: rest }
    persist()
  }, [])

  const upsertMed = useCallback((med: Medication) => {
    const idx = memState.medications.findIndex(m => m.id === med.id)
    const meds = idx >= 0
      ? memState.medications.map(m => m.id === med.id ? med : m)
      : [...memState.medications, med]
    memState = { ...memState, medications: meds }
    persist()
  }, [])

  const deleteMed = useCallback((id: string) => {
    memState = { ...memState, medications: memState.medications.filter(m => m.id !== id) }
    persist()
  }, [])

  const upsertSymptomDef = useCallback((def: SymptomDef) => {
    const idx = memState.symptomDefs.findIndex(s => s.id === def.id)
    const defs = idx >= 0
      ? memState.symptomDefs.map(s => s.id === def.id ? def : s)
      : [...memState.symptomDefs, def]
    memState = { ...memState, symptomDefs: defs }
    persist()
  }, [])

  const deleteSymptomDef = useCallback((id: string) => {
    memState = { ...memState, symptomDefs: memState.symptomDefs.filter(s => s.id !== id) }
    persist()
  }, [])

  const bulkImport = useCallback((entries: Entry[]) => {
    const next = { ...memState.entries }
    for (const e of entries) {
      next[e.date] = { ...e, updatedAt: Date.now() }
    }
    memState = { ...memState, entries: next }
    persist()
  }, [])

  const replaceAll = useCallback((s: DiaryState) => {
    memState = s
    persist()
  }, [])

  return {
    state,
    upsertEntry,
    deleteEntry,
    upsertMed,
    deleteMed,
    upsertSymptomDef,
    deleteSymptomDef,
    bulkImport,
    replaceAll
  }
}

export function newId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
