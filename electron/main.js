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
