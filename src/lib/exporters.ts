import * as XLSX from 'xlsx'
import type { Entry } from '../types'

export function filterByRange(entries: Record<string, Entry>, from: string, to: string): Entry[] {
  return Object.values(entries)
    .filter(e => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Wide format suitable for doctor sharing */
function toWideRows(entries: Entry[]) {
  const rows: Record<string, string | number>[] = []
  for (const e of entries) {
    const row: Record<string, string | number> = { 日付: e.date }
    for (const s of e.symptoms) {
      row[`${s.name}(程度)`] = s.level
      if (s.value !== undefined) row[`${s.name}(${s.unit || '値'})`] = s.value
    }
    // 薬名ごとに集約。チェックされた服薬の時刻のみをカンマ区切りで出力する。
    // チェックなしは「—」。同名の薬が複数時間帯にある場合も上書きされないよう Map で集約する。
    const medsByName = new Map<string, string[]>()
    for (const m of e.meds) {
      const key = `薬:${m.name}`
      if (!medsByName.has(key)) medsByName.set(key, [])
      if (m.taken) medsByName.get(key)!.push(m.time ?? '')
    }
    for (const [key, takenTimes] of medsByName) {
      if (takenTimes.length === 0) {
        row[key] = '—'
      } else {
        const times = takenTimes.filter(Boolean)
        row[key] = times.length > 0 ? times.join(', ') : '✓'
      }
    }
    row['備考'] = e.note
    rows.push(row)
  }
  return rows
}

export function exportExcel(entries: Entry[], filename: string) {
  const rows = toWideRows(entries)
  const ws = XLSX.utils.json_to_sheet(rows)
  // column width
  const keys = rows.length > 0 ? Object.keys(rows[0]) : []
  ws['!cols'] = keys.map(k => ({ wch: k === '備考' ? 32 : Math.max(12, k.length + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '健康記録')
  XLSX.writeFile(wb, filename)
}

/** Split-sheet format: "症状" sheet + "服薬・備考" sheet */
export function exportExcelSplit(entries: Entry[], filename: string) {
  // 症状シート
  const symptomRows: Record<string, string | number>[] = []
  for (const e of entries) {
    const row: Record<string, string | number> = { 日付: e.date }
    for (const s of e.symptoms) {
      row[`${s.name}(程度)`] = s.level
      if (s.value !== undefined) row[`${s.name}(${s.unit || '値'})`] = s.value
    }
    symptomRows.push(row)
  }

  // 服薬・備考シート
  const medRows: Record<string, string | number>[] = []
  for (const e of entries) {
    const row: Record<string, string | number> = { 日付: e.date }
    const medsByName = new Map<string, string[]>()
    for (const m of e.meds) {
      const key = `薬:${m.name}`
      if (!medsByName.has(key)) medsByName.set(key, [])
      if (m.taken) medsByName.get(key)!.push(m.time ?? '')
    }
    for (const [key, takenTimes] of medsByName) {
      if (takenTimes.length === 0) {
        row[key] = '—'
      } else {
        const times = takenTimes.filter(Boolean)
        row[key] = times.length > 0 ? times.join(', ') : '✓'
      }
    }
    row['備考'] = e.note
    medRows.push(row)
  }

  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(symptomRows)
  const keys1 = symptomRows.length > 0 ? Object.keys(symptomRows[0]) : []
  ws1['!cols'] = keys1.map(k => ({ wch: Math.max(12, k.length + 2) }))
  XLSX.utils.book_append_sheet(wb, ws1, '症状記録')

  const ws2 = XLSX.utils.json_to_sheet(medRows)
  const keys2 = medRows.length > 0 ? Object.keys(medRows[0]) : []
  ws2['!cols'] = keys2.map(k => ({ wch: k === '備考' ? 32 : Math.max(12, k.length + 2) }))
  XLSX.utils.book_append_sheet(wb, ws2, '服薬記録・備考')

  XLSX.writeFile(wb, filename)
}

export function exportCSV(entries: Entry[], filename: string) {
  const rows = toWideRows(entries)
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  // UTF-8 BOM for Excel Japanese compatibility
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Template rows: header columns that the importer recognizes, plus 1 sample row. */
function buildTemplateRows() {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  return [
    {
      '日付': dateStr,
      '頭痛(程度)': 3,
      '体温(℃)': 36.7,
      '薬:ロキソニン': '08:00 ✓',
      '備考': '※この行はサンプルです。記入前に削除してください。',
    },
  ]
}

export function exportTemplateExcel(filename: string) {
  const rows = buildTemplateRows()
  const ws = XLSX.utils.json_to_sheet(rows)
  const keys = Object.keys(rows[0])
  ws['!cols'] = keys.map(k => ({ wch: k === '備考' ? 40 : Math.max(14, k.length + 4) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '健康記録テンプレート')
  XLSX.writeFile(wb, filename)
}

/** Split-sheet template matching exportExcelSplit format */
export function exportTemplateSplitExcel(filename: string) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const symptomRows = [{
    '日付': dateStr,
    '頭痛(程度)': 3,
    '体温(℃)': 36.7,
  }]
  const medRows = [{
    '日付': dateStr,
    '薬:ロキソニン': '08:00 ✓',
    '備考': '※この行はサンプルです。記入前に削除してください。',
  }]

  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(symptomRows)
  ws1['!cols'] = Object.keys(symptomRows[0]).map(k => ({ wch: Math.max(14, k.length + 4) }))
  XLSX.utils.book_append_sheet(wb, ws1, '症状記録')

  const ws2 = XLSX.utils.json_to_sheet(medRows)
  ws2['!cols'] = Object.keys(medRows[0]).map(k => ({ wch: k === '備考' ? 40 : Math.max(14, k.length + 4) }))
  XLSX.utils.book_append_sheet(wb, ws2, '服薬記録・備考')

  XLSX.writeFile(wb, filename)
}

export function exportTemplateCSV(filename: string) {
  const rows = buildTemplateRows()
  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** PDF via html2canvas + jspdf. Japanese works because content is rasterized. */
export async function exportPDF(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ])
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
  } else {
    // multi-page: slice the canvas
    let position = 0
    let remaining = imgHeight
    const pxPerMm = canvas.width / pageWidth
    const pagePx = pageHeight * pxPerMm
    let srcY = 0
    while (remaining > 0) {
      const sliceH = Math.min(pagePx, canvas.height - srcY)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      const ctx = slice.getContext('2d')!
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      const sliceData = slice.toDataURL('image/jpeg', 0.95)
      if (position > 0) pdf.addPage()
      pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, (sliceH / pxPerMm))
      srcY += sliceH
      remaining -= pageHeight
      position += 1
    }
  }
  pdf.save(filename)
}
