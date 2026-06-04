import { useState } from 'react'
import { extractCid } from '../lib/cidExtractor'
import { fetchAll } from '../lib/fanzaApi'

export default function FolderSelect({ onNext }) {
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const handleSelect = async () => {
    setErrorMsg('')

    // APIキー確認
    const { apiId, affiliateId } = await window.electron.getSettings()
    if (!apiId || !affiliateId) {
      setErrorMsg('APIキーが設定されていません。右上の設定から入力してください。')
      return
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

    setStatus('loading')
    setProgress({ current: 0, total: filesWithCid.length })

    try {
      const results = await fetchAll(
        filesWithCid,
        apiId,
        affiliateId,
        (current, total) => setProgress({ current, total })
      )
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
          <p>Fanza APIで情報を取得中...</p>
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
