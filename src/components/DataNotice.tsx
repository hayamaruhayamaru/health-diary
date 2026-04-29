export default function DataNotice() {
  return (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-12">
        <div className="flex items-baseline gap-4 mb-6 hair-b pb-4">
          <span className="display italic text-accent text-[32px]">i.</span>
          <h3 className="mincho text-[24px]">データの取り扱いについて</h3>
        </div>

        <div className="card p-6">
          <div className="mincho text-[15px] mb-4">保存場所</div>
          <div className="mincho text-[13px] leading-relaxed">
            このアプリは、お使いのブラウザ内の記憶領域（ローカルストレージ）にデータを保存しています。
          </div>
          <div className="mincho text-[13px] leading-relaxed text-accent">
            外部のサーバーには一切送信されません。
          </div>
        </div>

        <div className="card p-6 mt-6">
          <div className="mincho text-[15px] mb-4">データが失われる可能性のあるケース</div>
          <div className="mincho text-[13px] leading-relaxed">
            以下の場合はデータが失われる可能性がありますので、こまめに「04 ・ 入出力」タブでのファイル出力（バックアップ）を推奨します。
          </div>
          <ul className="mincho text-[13px] leading-relaxed list-disc pl-5 mt-3 space-y-1">
            <li>ブラウザの「Cookie とサイトデータ」を削除したとき</li>
            <li>プライベート／シークレットウィンドウで使用したとき</li>
            <li>別のブラウザ／端末／ユーザーから開いたとき（データは共有されません）</li>
            <li>ブラウザをアンインストールしたとき</li>
          </ul>
        </div>

        <div className="card p-6 mt-6">
          <div className="mincho text-[15px] mb-4">バックアップと復元</div>
          <div className="mincho text-[13px] leading-relaxed">
            「04 ・ 入出力」タブから Excel / CSV / PDF 形式でデータを書き出せます。
          </div>
          <div className="mincho text-[13px] leading-relaxed mt-2">
            書き出した Excel / CSV / テキストファイルは、同じタブから取り込み（復元）も可能です。
          </div>
          <div className="mincho text-[13px] leading-relaxed mt-2 text-accent">
            機種変更・ブラウザ移行の前には、必ずファイル出力でのバックアップを行ってください。
          </div>
        </div>
      </div>
    </div>
  )
}
