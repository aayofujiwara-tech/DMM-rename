# DMM Renamer - 実装指示書

## あなたへの指示

このファイルを読んだら、以下の順番で実装を進めてください。
確認や質問は不要です。すべての仕様はこのファイルに記載されています。
実装が完了したら `git push origin main` までやりきってください。

---

## 事前確認（最初に必ず実行）

```powershell
# Node.jsのバージョン確認（18以上であること）
node -v

# Gitの設定確認
git config user.name
git config user.email
```

Gitのuser.name / user.emailが未設定の場合は以下を実行：
```powershell
git config --global user.name "aayofujiwara-tech"
git config --global user.email "GitHubに登録しているメールアドレス"
```

---

## 作業ディレクトリ

```
C:\Users\ain12\DMM-rename\
```

このディレクトリがなければ作成してクローン：
```powershell
cd C:\Users\ain12
git clone https://github.com/aayofujiwara-tech/DMM-rename.git
cd DMM-rename
```

すでにあればそのまま使う。

---

## プロジェクト初期化

```powershell
cd C:\Users\ain12\DMM-rename

# Vite + React をセットアップ
npm create vite@latest . -- --template react
# 上書き確認が出たら "y" を選択

# 依存パッケージをインストール
npm install
npm install electron electron-builder electron-store concurrently wait-on cross-env
npm install --save-dev @electron-forge/cli
```

---

## 最終的なファイル構成

```
C:\Users\ain12\DMM-rename\
├── electron/
│   ├── main.js
│   └── preload.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── pages/
│   │   ├── Settings.jsx
│   │   ├── FolderSelect.jsx
│   │   └── Preview.jsx
│   └── lib/
│       ├── cidExtractor.js
│       ├── fanzaApi.js
│       ├── scraper.js
│       └── renamer.js
├── index.html
├── package.json
├── vite.config.js
└── CLAUDE.md
```

---

## package.json（完全版）

以下の内容で上書きする：

```json
{
  "name": "dmm-renamer",
  "version": "1.0.0",
  "description": "DMMダウンロードファイルをFanza APIで女優名・タイトルにリネームするツール",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "build": "vite build",
    "dist": "vite build && electron-builder",
    "preview": "vite preview"
  },
  "build": {
    "appId": "com.aayofujiwara.dmm-renamer",
    "productName": "DMM Renamer",
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "directories": {
      "output": "release"
    }
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "concurrently": "^8.0.0",
    "cross-env": "^7.0.3",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    "wait-on": "^7.0.0"
  }
}
```

---

## vite.config.js（完全版）

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
```

---

## electron/main.js（完全版）

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

const store = new Store()
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// APIキーの取得・保存
ipcMain.handle('get-settings', () => {
  return {
    apiId: store.get('apiId', ''),
    affiliateId: store.get('affiliateId', ''),
  }
})

ipcMain.handle('save-settings', (_, { apiId, affiliateId }) => {
  store.set('apiId', apiId)
  store.set('affiliateId', affiliateId)
  return true
})

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// .dcvファイル一覧取得
ipcMain.handle('get-dcv-files', (_, folderPath) => {
  const files = fs.readdirSync(folderPath)
  return files
    .filter(f => f.endsWith('.dcv'))
    .map(f => ({ name: f, path: path.join(folderPath, f) }))
})

// ファイルリネーム実行
ipcMain.handle('rename-files', (_, renames) => {
  // renames: [{ oldPath, newPath }]
  const results = []
  for (const { oldPath, newPath } of renames) {
    try {
      fs.renameSync(oldPath, newPath)
      results.push({ oldPath, success: true })
    } catch (e) {
      results.push({ oldPath, success: false, error: e.message })
    }
  }
  return results
})
```

---

## electron/preload.js（完全版）

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDcvFiles: (folderPath) => ipcRenderer.invoke('get-dcv-files', folderPath),
  renameFiles: (renames) => ipcRenderer.invoke('rename-files', renames),
})
```

---

## src/lib/cidExtractor.js（完全版）

```javascript
/**
 * .dcvファイル名からFanza APIのcidと表示用品番を抽出する
 *
 * 実例:
 *   masm00001hhb.dcv        → { cid: 'masm00001', label: 'MASM-1' }
 *   1dandy00812a2d_v1_drm_a_4k.dcv → { cid: 'dandy00812', label: 'DANDY-812' }
 *   miaa00629mhb.dcv        → { cid: 'miaa00629', label: 'MIAA-629' }
 */
export function extractCid(filename) {
  let s = filename

  // 1. 拡張子除去
  s = s.replace(/\.dcv$/i, '')

  // 2. 画質・DRMサフィックス除去（例: _v1_drm_a_4k）
  s = s.replace(/_(v\d+_)?drm_[a-z0-9_]+$/i, '')

  // 3. 末尾のエンコード種別除去（hhb / mhb / a2d / hhb2）
  s = s.replace(/(hhb2?|mhb|a2d)$/i, '')

  // 4. 先頭の数字除去（例: 1dandy → dandy）
  s = s.replace(/^\d+/, '')

  const cid = s.toLowerCase()

  // 5. 品番ラベル生成（例: miaa00629 → MIAA-629）
  const match = cid.match(/^([a-z]+)(\d+)$/)
  const label = match
    ? `${match[1].toUpperCase()}-${parseInt(match[2], 10)}`
    : cid.toUpperCase()

  return { cid, label }
}
```

---

## src/lib/fanzaApi.js（完全版）

```javascript
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Fanza APIでcidを検索してタイトル・女優名を返す
 * @returns {{ title: string, actresses: string[] } | null}
 */
export async function fetchFanzaItem(cid, apiId, affiliateId) {
  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    cid: cid,
    output: 'json',
  })

  const url = `https://api.dmm.com/affiliate/v3/ItemList?${params}`

  let res
  try {
    res = await fetch(url)
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (res.status === 401) throw new Error('AUTH_ERROR')
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error('API_ERROR')

  const data = await res.json()
  const items = data?.result?.items
  if (!items || items.length === 0) return null

  const item = items[0]
  const title = item.title ?? ''
  const actresses = item.iteminfo?.actress?.map((a) => a.name) ?? []

  return { title, actresses }
}

/**
 * 複数ファイルを順番に処理（1秒間隔でレート制限を守る）
 * @param {Array<{ name, path, cid, label }>} files
 * @param {string} apiId
 * @param {string} affiliateId
 * @param {function} onProgress - (index, total, result) を受け取るコールバック
 */
export async function fetchAll(files, apiId, affiliateId, onProgress) {
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let result

    try {
      const data = await fetchFanzaItem(file.cid, apiId, affiliateId)
      if (data) {
        result = { ...file, status: 'ok', ...data }
      } else {
        result = { ...file, status: 'not_found' }
      }
    } catch (e) {
      if (e.message === 'RATE_LIMIT') {
        await sleep(3000)
        // 1回リトライ
        try {
          const data = await fetchFanzaItem(file.cid, apiId, affiliateId)
          result = data
            ? { ...file, status: 'ok', ...data }
            : { ...file, status: 'not_found' }
        } catch {
          result = { ...file, status: 'error', error: e.message }
        }
      } else {
        result = { ...file, status: 'error', error: e.message }
      }
    }

    results.push(result)
    onProgress(i + 1, files.length, result)

    if (i < files.length - 1) await sleep(1000)
  }

  return results
}
```

---

## src/lib/renamer.js（完全版）

```javascript
import path from 'path-browserify'

/**
 * Windowsで使えない文字を除去
 */
function sanitize(str) {
  return str.replace(/[\\/:*?"<>|]/g, '').trim()
}

/**
 * リネーム後のファイル名を生成
 * 形式: [MIAA-629] タイトル名 - 波多野結衣_上原亜衣.dcv
 */
export function buildNewName(label, title, actresses) {
  const safeTitle = sanitize(title)
  const safeActresses = actresses.map(sanitize).join('_')

  if (safeActresses) {
    return `[${label}] ${safeTitle} - ${safeActresses}.dcv`
  } else {
    return `[${label}] ${safeTitle}.dcv`
  }
}

/**
 * リネーム対象リストを生成
 * @param {Array} items - fetchAllの結果
 * @param {string} folderPath
 * @returns {Array<{ oldPath, newPath, oldName, newName }>}
 */
export function buildRenameList(items, folderPath) {
  return items
    .filter((item) => item.status === 'ok')
    .map((item) => {
      const newName = buildNewName(item.label, item.title, item.actresses)
      return {
        oldPath: item.path,
        newPath: `${folderPath}\\${newName}`,
        oldName: item.name,
        newName,
      }
    })
}
```

---

## src/App.jsx（完全版）

```jsx
import { useState } from 'react'
import Settings from './pages/Settings'
import FolderSelect from './pages/FolderSelect'
import Preview from './pages/Preview'
import './index.css'

export default function App() {
  const [page, setPage] = useState('folder') // 'folder' | 'preview' | 'settings'
  const [previewData, setPreviewData] = useState([])
  const [folderPath, setFolderPath] = useState('')

  return (
    <div className="app">
      <header>
        <h1>DMM Renamer</h1>
        <button onClick={() => setPage('settings')}>⚙ 設定</button>
      </header>

      {page === 'settings' && (
        <Settings onBack={() => setPage('folder')} />
      )}

      {page === 'folder' && (
        <FolderSelect
          onNext={(items, folder) => {
            setPreviewData(items)
            setFolderPath(folder)
            setPage('preview')
          }}
        />
      )}

      {page === 'preview' && (
        <Preview
          items={previewData}
          folderPath={folderPath}
          onBack={() => setPage('folder')}
        />
      )}
    </div>
  )
}
```

---

## src/pages/Settings.jsx（完全版）

データソース選択UI付き。`source` が `'api'` のときのみAPIキー入力欄を表示。

```jsx
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
          <input type="radio" value="scraping" checked={source === 'scraping'} onChange={() => setSource('scraping')} />
          スクレイピング（設定不要）
        </label>
        <label>
          <input type="radio" value="api" checked={source === 'api'} onChange={() => setSource('api')} />
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
            <input type="text" value={apiId} onChange={(e) => setApiId(e.target.value)} placeholder="your_api_id" />
          </label>
          <label>
            アフィリエイト ID
            <input type="text" value={affiliateId} onChange={(e) => setAffiliateId(e.target.value)} placeholder="your-001" />
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
```

---

## src/pages/FolderSelect.jsx（完全版）

設定の `source` を読み取り、`'scraping'` なら `scrapeAll`、`'api'` なら `fetchAll` を呼ぶ。

```jsx
import { useState } from 'react'
import { extractCid } from '../lib/cidExtractor'
import { fetchAll } from '../lib/fanzaApi'
import { scrapeAll } from '../lib/scraper'

export default function FolderSelect({ onNext }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [usingScraping, setUsingScraping] = useState(false)

  const handleSelect = async () => {
    setErrorMsg('')
    const { apiId, affiliateId, source } = await window.electron.getSettings()

    if (source !== 'scraping' && (!apiId || !affiliateId)) {
      setErrorMsg('APIキーが設定されていません。右上の設定から入力してください。')
      return
    }

    const folder = await window.electron.selectFolder()
    if (!folder) return

    const files = await window.electron.getDcvFiles(folder)
    if (files.length === 0) {
      setErrorMsg('選択したフォルダに .dcv ファイルが見つかりませんでした。')
      return
    }

    const filesWithCid = files.map((f) => ({ ...f, ...extractCid(f.name) }))
    setUsingScraping(source === 'scraping')
    setStatus('loading')
    setProgress({ current: 0, total: filesWithCid.length })

    try {
      let results
      if (source === 'scraping') {
        results = await scrapeAll(filesWithCid, (current, total) => setProgress({ current, total }))
      } else {
        results = await fetchAll(filesWithCid, apiId, affiliateId, (current, total) => setProgress({ current, total }))
      }
      onNext(results, folder)
    } catch (e) {
      if (e.message === 'AUTH_ERROR') setErrorMsg('APIキーが無効です。設定を確認してください。')
      else if (e.message === 'NETWORK_ERROR') setErrorMsg('通信エラーが発生しました。インターネット接続を確認してください。')
      else setErrorMsg(`エラーが発生しました: ${e.message}`)
      setStatus('idle')
    }
  }

  return (
    <div className="page center">
      {status === 'idle' && (
        <>
          <p>.dcv ファイルが入ったフォルダを選択してください。</p>
          {errorMsg && <p className="error">{errorMsg}</p>}
          <button className="primary large" onClick={handleSelect}>フォルダを選択</button>
        </>
      )}
      {status === 'loading' && (
        <>
          <p>{usingScraping ? 'スクレイピングで情報を取得中...' : 'Fanza APIで情報を取得中...'}</p>
          <p>{progress.current} / {progress.total} 件</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </>
      )}
    </div>
  )
}
```

---

## src/pages/Preview.jsx（完全版）

```jsx
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
```

---

## src/index.css（完全版）

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

header h1 { font-size: 18px; color: #e94560; }

.page {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.page.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

h2 { font-size: 20px; margin-bottom: 16px; color: #e0e0e0; }

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #a0a0b0;
}

input[type="text"] {
  padding: 8px 12px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  width: 100%;
  max-width: 400px;
}

button {
  padding: 8px 18px;
  border: 1px solid #0f3460;
  border-radius: 6px;
  background: #16213e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 14px;
}

button:hover { background: #0f3460; }
button:disabled { opacity: 0.4; cursor: default; }
button.primary { background: #e94560; border-color: #e94560; color: #fff; }
button.primary:hover { background: #c73652; }
button.large { font-size: 16px; padding: 12px 32px; }

.actions { display: flex; gap: 12px; margin-top: 24px; }
.bulk-actions { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.count { margin-left: auto; color: #a0a0b0; font-size: 14px; }

.file-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }

.file-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
}

.file-item.skipped { opacity: 0.45; }
.file-item.unchecked { opacity: 0.6; }

.file-names { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.old-name { color: #a0a0b0; }
.new-name { color: #4ecca3; }
.no-match { color: #666; font-style: italic; }

.error { color: #e94560; font-size: 14px; }

.progress-bar {
  width: 300px;
  height: 6px;
  background: #16213e;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #e94560;
  transition: width 0.3s;
}

a { color: #4ecca3; }
```

---

## 動作確認手順

すべてのファイルを実装したら以下を実行：

```powershell
cd C:\Users\ain12\DMM-rename
npm run dev
```

ブラウザではなくElectronウィンドウが起動すれば成功。

起動したら：
1. 右上の「⚙ 設定」からAPIキーを入力・保存
2. 「フォルダを選択」で .dcv ファイルが入ったフォルダを選択
3. プレビュー画面でリネーム内容を確認
4. 「リネーム実行」をクリック

---

## GitHubへのプッシュ

動作確認が取れたら：

```powershell
cd C:\Users\ain12\DMM-rename
git add .
git commit -m "feat: DMM Renamer 初回実装"
git push origin main
```

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `electron-store` でエラー | ESM/CJS混在 | `electron-store` は v8系（CJS対応）を使うこと |
| `window.electron is undefined` | preload.jsの読み込み失敗 | `webPreferences` の `preload` パスを確認 |
| Viteビルド後に画面が真っ白 | `base: './'` が未設定 | `vite.config.js` の `base: './'` を確認 |
| APIが401を返す | APIキー不正 | Fanzaアフィリエイト管理画面でAPIキーを再確認 |
| スクレイピングでタイトル取得できない | HTML構造変更 | `og:title` と `h1.item-ttl` の両方を試みる実装済み |

---

## データソース切り替え機能

### 概要

Fanza API（要APIキー）とスクレイピング（設定不要）を設定画面で切り替えられる。
デフォルトは `'scraping'`。

### electron/main.js の追加ハンドラ

`fetch-page`: Node.js の `https` モジュールでDMMページをHTTP取得して生HTMLを返す。
- User-Agent をブラウザに偽装
- タイムアウト 10 秒
- 文字コード UTF-8

### electron/preload.js の追加API

```javascript
fetchPage: (url) => ipcRenderer.invoke('fetch-page', url),
```

### electron-store の保存キー（更新後）

| キー | 型 | デフォルト | 内容 |
|------|----|------------|------|
| `apiId` | string | `''` | Fanza API ID |
| `affiliateId` | string | `''` | アフィリエイト ID |
| `source` | `'api'` \| `'scraping'` | `'scraping'` | データソース |

### src/lib/scraper.js（完全版）

取得先: `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid={cid}/`

HTMLのパース方法（正規表現）:
- タイトル: `<meta property="og:title" content="...">` → フォールバックで `<h1 class="item-ttl">`
- 女優名: `<a href="/mono/actress/.../">女優名</a>` → フォールバックで `<span class="actress">`

返り値は `fanzaApi.js` と同形式: `{ title: string, actresses: string[] } | null`

### src/index.css の追加スタイル

```css
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.radio-group label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #e0e0e0;
  margin-bottom: 0;
}
```

