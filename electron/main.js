const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
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
    source: store.get('source', 'scraping'),
  }
})

ipcMain.handle('save-settings', (_, { apiId, affiliateId, source }) => {
  store.set('apiId', apiId)
  store.set('affiliateId', affiliateId)
  store.set('source', source)
  return true
})

// スクレイピング用HTTPフェッチ
const http = require('http')

ipcMain.handle('fetch-page', async (_, url) => {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'identity',
      'Cookie': 'age_check_done=1',
    },
    timeout: 10000,
  }

  return new Promise((resolve) => {
    const fetchUrl = (targetUrl, redirectCount) => {
      if (redirectCount > 5) return resolve(null)
      const client = targetUrl.startsWith('https') ? https : http
      const req = client.get(targetUrl, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume()
          const location = res.headers.location
          if (!location) return resolve(null)
          const next = location.startsWith('http') ? location : new URL(location, targetUrl).href
          return fetchUrl(next, redirectCount + 1)
        }
        const chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        res.on('error', () => resolve(null))
      })
      req.on('error', () => resolve(null))
      req.on('timeout', () => { req.destroy(); resolve(null) })
    }
    fetchUrl(url, 0)
  })
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
