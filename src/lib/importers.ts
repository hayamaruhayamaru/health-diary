import * as XLSX from 'xlsx'
import type { Entry, SymptomRecord } from '../types'
import { newId } from '../store/useDiary'

/**
 * Try to normalize a date-ish string to YYYY-MM-DD.
 * Returns null if unparseable.
 */
function normalizeDate(raw: string | number | Date | undefined): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`
  }
  if (typeof raw === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(raw).trim()
  // Match YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  // fallback Date.parse
  const p = new Date(s)
  if (!isNaN(p.getTime())) {
    return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,'0')}-${String(p.getDate()).padStart(2,'0')}`
  }
  return null
}

export type ImportResult = {
  entries: Entry[]
  failedLines: string[]
}

/** Parse sheet rows (array-of-object) into Entry[]. Unmapped keys go into note. */
function rowsToEntries(rows: Record<string, unknown>[]): ImportResult {
  const entries: Entry[] = []
  const failed: string[] = []
  for (const row of rows) {
    const dateRaw = row['日付'] ?? row['date'] ?? row['Date'] ?? row['DATE']
    const date = normalizeDate(dateRaw as any)
    if (!date) {
      failed.push(JSON.stringify(row))
      continue
    }
    const symptoms: SymptomRecord[] = []
    const meds: Entry['meds'] = []
    let note = String(row['備考'] ?? row['memo'] ?? row['note'] ?? '')

    for (const [key, val] of Object.entries(row)) {
      if (key === '日付' || key === '備考' || key === 'date' || key === 'Date' || key === 'memo' || key === 'note') continue
      if (val === undefined || val === null || val === '') continue
      // Symptom level: "頭痛(程度)"
      const lvlMatch = key.match(/^(.+?)\(程度\)$/)
      if (lvlMatch) {
        const name = lvlMatch[1]
        const lvl = Number(val)
        if (!isNaN(lvl)) {
          symptoms.push({ id: newId('sym'), name, level: Math.max(0, Math.min(10, lvl)) })
        }
        continue
      }
      // Symptom value: "体温(℃)"
      const valMatch = key.match(/^(.+?)\((.+?)\)$/)
      if (valMatch && !key.includes('程度')) {
        const name = valMatch[1]
        const unit = valMatch[2]
        const num = Number(val)
        if (!isNaN(num)) {
          const existing = symptoms.find(s => s.name === name)
          if (existing) { existing.value = num; existing.unit = unit }
          else symptoms.push({ id: newId('sym'), name, level: 0, value: num, unit })
        }
        continue
      }
      // Medication: "薬:ロキソニン"
      const medMatch = key.match(/^薬[:：](.+)$/)
      if (medMatch) {
        const name = medMatch[1]
        const str = String(val)
        const taken = str.includes('✓') || str.toLowerCase() === 'y' || str === '○'
        const timeMatch = str.match(/(\d{1,2}:\d{2})/)
        meds.push({ medId: newId('m'), name, taken, time: timeMatch?.[1] })
        continue
      }
      // Unknown column → append to note
      note += (note ? '\n' : '') + `${key}: ${val}`
    }

    entries.push({ date, symptoms, meds, note, updatedAt: Date.now() })
  }
  return { entries, failedLines: failed }
}

export async function importExcelOrCSV(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' }) as Record<string, unknown>[]
  return rowsToEntries(rows)
}

/**
 * Text import (freeform memo.txt).
 * Strategy:
 *  - Lines starting with a date (YYYY-MM-DD / YYYY/MM/DD / YYYY年M月D日) begin a new day
 *  - Subsequent lines until next date are appended to that day's note
 *  - Completely unparseable blocks → failedLines
 */
export function importText(content: string): ImportResult {
  const lines = content.split(/\r?\n/)
  const buckets: Record<string, string[]> = {}
  const failed: string[] = []
  let current: string | null = null
  const dateHead = /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?[\s:：]?(.*)$/

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) continue
    const m = line.match(dateHead)
    if (m) {
      const date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
      current = date
      if (!buckets[date]) buckets[date] = []
      if (m[4]) buckets[date].push(m[4])
    } else {
      if (current) buckets[current].push(line)
      else failed.push(line)
    }
  }

  const entries: Entry[] = Object.entries(buckets).map(([date, lines]) => ({
    date,
    symptoms: [],
    meds: [],
    note: lines.join('\n'),
    updatedAt: Date.now()
  }))
  return { entries, failedLines: failed }
}
