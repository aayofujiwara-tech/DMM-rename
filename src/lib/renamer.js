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
