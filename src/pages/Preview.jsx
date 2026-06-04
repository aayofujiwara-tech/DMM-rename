import { useState } from 'react'
import { buildNewName } from '../lib/renamer'

export default function Preview({ items, folderPath, onBack }) {
  // チェック状態: status==='ok' のみ初期ON
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(items.map((item) => [item.name, item.status === 'ok']))
  )
  const [done, setDone] = useState(null) // null | { success, failed, skipped }

  const toggle = (name) =>
    setChecked((prev) => ({ ...prev, [name]: !prev[name] }))

  const checkAll = () =>
    setChecked(Object.fromEntries(items.map((i) => [i.name, i.status === 'ok'])))

  const uncheckAll = () =>
    setChecked(Object.fromEntries(items.map((i) => [i.name, false])))

  const execute = async () => {
    const renames = items
      .filter((item) => item.status === 'ok' && checked[item.name])
      .map((item) => ({
        oldPath: item.path,
        newPath: `${folderPath}\\${buildNewName(item.label, item.title, item.actresses)}`,
        oldName: item.name,
        newName: buildNewName(item.label, item.title, item.actresses),
      }))

    const results = await window.electron.renameFiles(renames)
    const success = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    const skipped = items.filter(
      (item) => item.status !== 'ok' || !checked[item.name]
    ).length

    setDone({ success, failed, skipped })
  }

  if (done) {
    return (
      <div className="page center">
        <h2>完了</h2>
        <p>✓ リネーム成功: {done.success} 件</p>
        {done.failed > 0 && <p className="error">✗ 失敗: {done.failed} 件</p>}
        <p>スキップ: {done.skipped} 件</p>
        <button className="primary" onClick={onBack}>
          最初に戻る
        </button>
      </div>
    )
  }

  const okCount = items.filter((i) => i.status === 'ok' && checked[i.name]).length

  return (
    <div className="page">
      <h2>プレビュー</h2>

      <div className="bulk-actions">
        <button onClick={checkAll}>すべて選択</button>
        <button onClick={uncheckAll}>すべて解除</button>
        <span className="count">{okCount} 件をリネーム</span>
      </div>

      <ul className="file-list">
        {items.map((item) => {
          const isOk = item.status === 'ok'
          const isChecked = checked[item.name]
          const newName = isOk
            ? buildNewName(item.label, item.title, item.actresses)
            : null

          return (
            <li
              key={item.name}
              className={`file-item ${!isOk ? 'skipped' : ''} ${isOk && !isChecked ? 'unchecked' : ''}`}
            >
              <input
                type="checkbox"
                checked={isOk ? isChecked : false}
                disabled={!isOk}
                onChange={() => toggle(item.name)}
              />
              <div className="file-names">
                <span className="old-name">{item.name}</span>
                {isOk ? (
                  <span className="new-name">→ {newName}</span>
                ) : (
                  <span className="no-match">APIヒットなし・スキップ</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="actions">
        <button onClick={onBack}>← 戻る</button>
        <button className="primary" onClick={execute} disabled={okCount === 0}>
          リネーム実行（{okCount} 件）
        </button>
      </div>
    </div>
  )
}
