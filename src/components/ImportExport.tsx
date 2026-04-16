import { useRef, useState } from 'react'
import { useDiary, todayStr } from '../store/useDiary'
import { filterByRange, exportCSV, exportExcelSplit, exportPDF, exportTemplateSplitExcel, exportTemplateCSV } from '../lib/exporters'
import { importExcelOrCSV, importText } from '../lib/importers'
import type { Entry } from '../types'

export default function ImportExport() {
  const { state, bulkImport } = useDiary()
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(todayStr())
  const [status, setStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [failedLines, setFailedLines] = useState<string[]>([])
  const printRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rangeEntries = filterByRange(state.entries, from, to)

  const doCSV = () => {
    if (rangeEntries.length === 0) return setStatus('対象期間に記録がありません')
    exportCSV(rangeEntries, `健康記録_${from}_${to}.csv`)
    setStatus(`CSV 出力 (${rangeEntries.length}日分)`)
  }
  const doExcelSplit = () => {
    if (rangeEntries.length === 0) return setStatus('対象期間に記録がありません')
    exportExcelSplit(rangeEntries, `健康記録_シート分割_${from}_${to}.xlsx`)
    setStatus(`Excel 出力 (${rangeEntries.length}日分)`)
  }
  const doPDF = async () => {
    if (!printRef.current) return
    if (rangeEntries.length === 0) return setStatus('対象期間に記録がありません')
    setStatus('PDF生成中...')
    await exportPDF(printRef.current, `健康記録_${from}_${to}.pdf`)
    setStatus(`PDF 出力 (${rangeEntries.length}日分)`)
  }
  const doPrint = () => window.print()

  const doTemplateExcel = () => {
    exportTemplateSplitExcel('健康記録_入力フォーマット.xlsx')
    setImportStatus('入力フォーマット (Excel シート分割) をダウンロードしました')
  }
  const doTemplateCSV = () => {
    exportTemplateCSV('健康記録_入力フォーマット.csv')
    setImportStatus('入力フォーマット (CSV) をダウンロードしました')
  }

  const onFile = async (file: File) => {
    setImportStatus('読み込み中...')
    const ext = file.name.toLowerCase()
    let result
    if (ext.endsWith('.txt')) {
      const text = await file.text()
      result = importText(text)
    } else {
      result = await importExcelOrCSV(file)
    }
    bulkImport(result.entries)
    setFailedLines(result.failedLines)
    setImportStatus(`取り込み完了: ${result.entries.length}件 / パース失敗 ${result.failedLines.length}件`)
  }

  return (
    <div className="grid grid-cols-12 gap-10">
      {/* Notice */}
      <div className="col-span-12">
        <div className="card p-6">
          <div className="mincho text-[16px] mb-3">データの取り扱いについて</div>
          <div className="mincho text-[13px] leading-relaxed">
            このアプリは、お使いのブラウザ内の記憶領域（ローカルストレージ）にデータを保存しています。
          </div>
          <div className="mincho text-[13px] leading-relaxed text-accent">
            外部のサーバーには一切送信されません。
          </div>
          <div className="mincho text-[13px] leading-relaxed mt-3">
            以下の場合はデータが失われる可能性がありますので、こまめにファイル出力でのバックアップを推奨します。
          </div>
          <ul className="mincho text-[13px] leading-relaxed list-disc pl-5 mt-2 space-y-1">
            <li>ブラウザの「Cookie とサイトデータ」を削除したとき</li>
            <li>プライベート／シークレットウィンドウで使用したとき</li>
            <li>別のブラウザ／端末／ユーザーから開いたとき（データは共有されません）</li>
            <li>ブラウザをアンインストールしたとき</li>
          </ul>
        </div>
      </div>

      {/* Export */}
      <div className="col-span-7">
        <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
          <span className="display italic text-accent text-[32px]">i.</span>
          <h3 className="mincho text-[24px]">エクスポート</h3>
        </div>

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <label>
              <div className="eyebrow mb-2">From</div>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </label>
            <label>
              <div className="eyebrow mb-2">To</div>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </label>
          </div>
          <div className="mono text-[11px] text-muted tracking-wider2 mb-5">
            選択範囲に含まれる記録: {rangeEntries.length} 日分 <span className="opacity-60">/ 全記録 {Object.keys(state.entries).length} 日分</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-accent" onClick={doExcelSplit}>Excel シート分割</button>
            <button className="btn" onClick={doCSV}>CSV</button>
            <button className="btn btn-ghost" onClick={doPDF}>PDF</button>
            <button className="btn btn-ghost" onClick={doPrint}>印刷</button>
          </div>
          {status && (
            <div className="mono text-[10px] tracking-wider2 text-accent mt-4">— {status}</div>
          )}
        </div>

        <div className="mono text-[10px] text-muted tracking-wider2 leading-relaxed">
          EXCEL シート分割は「症状記録」と「服薬記録・備考」の2シートで出力します。<br/>
          PDFはブラウザで描画した内容を画像化するため日本語の文字化けはありません。<br/>
          薬列はチェックを入れた服薬のみ出力されます（時刻のカンマ区切り）。<br/>
          チェックなしの服薬や、その日に1度もチェックされなかった薬は「—」で表示されます。
        </div>
      </div>

      {/* Import */}
      <div className="col-span-5">
        <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
          <span className="display italic text-accent text-[32px]">ii.</span>
          <h3 className="mincho text-[24px]">インポート</h3>
        </div>

        <div className="card p-6">
          <div className="mincho text-[13px] leading-relaxed text-muted mb-5">
            Excel / CSV / テキストファイル(.txt)を取り込めます。<br/>
            パースできない行は自動的に備考欄へ追加されます。
          </div>

          <div className="hair-t pt-4 mb-5">
            <div className="eyebrow mb-2">入力フォーマット</div>
            <div className="mono text-[10px] text-muted tracking-wider2 leading-relaxed mb-3">
              空のテンプレートをダウンロードして記入 → 同じファイルを取り込めます。<br/>
              列名: <span className="text-ink">日付 / 症状名(程度) / 症状名(単位) / 薬:薬名 / 備考</span>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={doTemplateExcel}>Excel シート分割テンプレ</button>
              <button className="btn btn-ghost" onClick={doTemplateCSV}>CSV テンプレ</button>
            </div>
          </div>

          <button
            className="btn btn-accent w-full justify-center mb-4"
            onClick={() => fileRef.current?.click()}
          >
            ファイルを選択
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />

          {importStatus && (
            <div className="mono text-[10px] tracking-wider2 text-accent mt-4">— {importStatus}</div>
          )}

          {failedLines.length > 0 && (
            <div className="mt-5 hair-t pt-4">
              <div className="eyebrow mb-2">Parse failures ({failedLines.length})</div>
              <div className="max-h-[180px] overflow-auto mono text-[10px] text-muted space-y-1">
                {failedLines.slice(0, 50).map((l, i) => (
                  <div key={i} className="truncate">{l}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden print layout */}
      <div style={{ position: 'absolute', left: -99999, top: 0 }} aria-hidden>
        <div ref={printRef} className="print-page p-12">
          <PrintReport entries={rangeEntries} from={from} to={to} />
        </div>
      </div>
    </div>
  )
}

function PrintReport({ entries, from, to }: { entries: Entry[], from: string, to: string }) {
  return (
    <div style={{ fontFamily: 'Zen Kaku Gothic New, sans-serif', color: '#111' }}>
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#666', textTransform: 'uppercase' }}>
          Personal Health Ledger
        </div>
        <div style={{ fontSize: 28, fontFamily: 'Zen Old Mincho, serif', marginTop: 4 }}>
          健康記録 &nbsp;<span style={{ fontSize: 14, color: '#666' }}>{from} — {to}</span>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #111' }}>
            <th style={th}>日付</th>
            <th style={th}>症状</th>
            <th style={th}>服薬</th>
            <th style={th}>備考</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.date} style={{ borderBottom: '1px solid #ddd', verticalAlign: 'top' }}>
              <td style={td}><b>{e.date}</b></td>
              <td style={td}>
                {e.symptoms.map((s, i) => (
                  <div key={i}>
                    {s.name} — {s.level}/10
                    {s.value !== undefined && ` · ${s.value}${s.unit ?? ''}`}
                  </div>
                ))}
              </td>
              <td style={td}>
                {e.meds.filter(m => m.taken).map((m, i) => (
                  <div key={i}>✓ {m.name} {m.time ?? ''}</div>
                ))}
              </td>
              <td style={{ ...td, whiteSpace: 'pre-wrap' }}>{e.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 20, fontSize: 9, color: '#888', textAlign: 'right' }}>
        issued {new Date().toLocaleString('ja-JP')}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 6px', fontSize: 10, letterSpacing: '0.1em' }
const td: React.CSSProperties = { padding: '8px 6px', fontSize: 11, lineHeight: 1.5 }
