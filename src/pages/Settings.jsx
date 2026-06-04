import { useState, useEffect } from 'react'

export default function Settings({ onBack }) {
  const [apiId, setApiId] = useState('')
  const [affiliateId, setAffiliateId] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electron.getSettings().then(({ apiId, affiliateId }) => {
      setApiId(apiId)
      setAffiliateId(affiliateId)
    })
  }, [])

  const save = async () => {
    await window.electron.saveSettings({ apiId, affiliateId })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <h2>設定</h2>
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

      <div className="actions">
        <button onClick={onBack}>← 戻る</button>
        <button className="primary" onClick={save}>
          {saved ? '✓ 保存しました' : '保存'}
        </button>
      </div>
    </div>
  )
}
