import { useState, useEffect } from 'react'

export default function Settings({ onBack }) {
  const [apiId, setApiId] = useState('')
  const [affiliateId, setAffiliateId] = useState('')
  const [source, setSource] = useState('scraping')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electron.getSettings().then(({ apiId, affiliateId, source }) => {
      setApiId(apiId)
      setAffiliateId(affiliateId)
      setSource(source ?? 'scraping')
    })
  }, [])

  const save = async () => {
    await window.electron.saveSettings({ apiId, affiliateId, source })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <h2>設定</h2>

      <label>データソース</label>
      <div className="radio-group">
        <label>
          <input
            type="radio"
            value="scraping"
            checked={source === 'scraping'}
            onChange={() => setSource('scraping')}
          />
          スクレイピング（設定不要）
        </label>
        <label>
          <input
            type="radio"
            value="api"
            checked={source === 'api'}
            onChange={() => setSource('api')}
          />
          Fanza API（APIキー必要）
        </label>
      </div>

      {source === 'api' && (
        <>
          <p>
            Fanza Affiliate API のキーを入力してください。<br />
            未登録の場合は{' '}
            <a href="https://affiliate.dmm.com/api/" target="_blank" rel="noreferrer">
              こちら
            </a>{' '}
            から取得してください。
          </p>

          <label>
            API ID
            <input
              type="text"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              placeholder="your_api_id"
            />
          </label>

          <label>
            アフィリエイト ID
            <input
              type="text"
              value={affiliateId}
              onChange={(e) => setAffiliateId(e.target.value)}
              placeholder="your-001"
            />
          </label>
        </>
      )}

      <div className="actions">
        <button onClick={onBack}>← 戻る</button>
        <button className="primary" onClick={save}>
          {saved ? '✓ 保存しました' : '保存'}
        </button>
      </div>
    </div>
  )
}
