const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDcvFiles: (folderPath) => ipcRenderer.invoke('get-dcv-files', folderPath),
  renameFiles: (renames) => ipcRenderer.invoke('rename-files', renames),
  fetchPage: (url) => ipcRenderer.invoke('fetch-page', url),
})
