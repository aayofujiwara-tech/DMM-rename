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
