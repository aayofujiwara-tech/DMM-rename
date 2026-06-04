export async function scrapeItem(cid) {
  const url = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${cid}/`
  const html = await window.electron.fetchPage(url)
  if (!html) return null

  // タイトル取得
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  const title = titleMatch ? titleMatch[1].replace(/\s*-\s*FANZA.*$/, '').trim() : null
  if (!title) return null

  // 女優名取得（複数対応）
  const actressMatches = [...html.matchAll(/\/mono\/actress\/\d+\/-\/"><span[^>]*>([^<]+)<\/span>/g)]
  let actresses = actressMatches.map(m => m[1].trim())

  // 上記でヒットしない場合の代替パターン
  if (actresses.length === 0) {
    const alt = [...html.matchAll(/actress[^>]*>([^<]{2,20})<\/a>/g)]
    actresses = alt.map(m => m[1].trim()).filter(n => n.length > 1)
  }

  return { title, actresses }
}

export async function scrapeAll(files, onProgress) {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const results = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let result
    try {
      const data = await scrapeItem(file.cid)
      result = data ? { ...file, status: 'ok', ...data } : { ...file, status: 'not_found' }
    } catch (e) {
      result = { ...file, status: 'error', error: e.message }
    }
    results.push(result)
    onProgress(i + 1, files.length, result)
    if (i < files.length - 1) await sleep(1000)
  }
  return results
}
