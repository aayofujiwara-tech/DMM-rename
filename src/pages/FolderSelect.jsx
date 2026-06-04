import { useState } from 'react'
import { extractCid } from '../lib/cidExtractor'
import { fetchAll } from '../lib/fanzaApi'
import { scrapeAll } from '../lib/scraper'

export default function FolderSelect({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | loading
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [usingScraping, setUsingScraping] = useState(false)

  const handleSelect = async () => {
    setErrorMsg('')

    const { apiId, affiliateId, source } = await window.electron.getSettings()
    console.log('source:', source)

    if (source !== 'scraping') {
      if (!apiId || !affiliateId) {
        setErrorMsg('APIキーが設定されていません。右上の設定から入力してください。')
        return
      }
    }

    // フォルダ選択
    const folder = await window.electron.selectFolder()
    if (!folder) return

    // .dcvファイル取得
    const files = await window.electron.getDcvFiles(folder)
    if (files.length === 0) {
      setErrorMsg('選択したフォルダに .dcv ファイルが見つかりませんでした。')
      return
    }

    // cid抽出
    const filesWithCid = files.map((f) => ({
      ...f,
      ...extractCid(f.name),
    }))
    console.log('files:', filesWithCid)

    setUsingScraping(source === 'scraping')
    setStatus('loading')
    setProgress({ current: 0, total: filesWithCid.length })

    try {
      let results
      if (source === 'scraping') {
        results = await scrapeAll(
          filesWithCid,
          (current, total) => setProgress({ current, total })
        )
      } else {
        results = await fetchAll(
          filesWithCid,
          apiId,
          affiliateId,
          (current, total) => setProgress({ current, total })
        )
      }
      onNext(results, folder)
    } catch (e) {
      if (e.message === 'AUTH_ERROR') {
        setErrorMsg('APIキーが無効です。設定を確認してください。')
      } else if (e.message === 'NETWORK_ERROR') {
        setErrorMsg('通信エラーが発生しました。インターネット接続を確認してください。')
      } else {
        setErrorMsg(`エラーが発生しました: ${e.message}`)
      }
      setStatus('idle')
    }
  }

  return (
    <div className="page center">
      {status === 'idle' && (
        <>
          <p>.dcv ファイルが入ったフォルダを選択してください。</p>
          {errorMsg && <p className="error">{errorMsg}</p>}
          <button className="primary large" onClick={handleSelect}>
            フォルダを選択
          </button>
        </>
      )}

      {status === 'loading' && (
        <>
          <p>{usingScraping ? 'スクレイピングで情報を取得中...' : 'Fanza APIで情報を取得中...'}</p>
          <p>
            {progress.current} / {progress.total} 件
          </p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
