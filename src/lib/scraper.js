export async function scrapeItem(cid) {
  console.log('scrapeItem called:', cid)
  const url = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${cid}/`
  console.log('fetching:', url)
  const html = await window.electron.fetchPage(url)
  console.log('html length:', html ? html.length : 'null')
  if (!html) return null

  // デバッグ: HTMLの先頭3000文字を出力
  console.log('html preview:', html.substring(0, 3000))

  // タイトル取得（既存パターン - デバッグ確認用）
  const titleMatchOrig = html.match(/<meta property="og:title" content="([^"]+)"/)
  console.log('titleMatch (original pattern):', titleMatchOrig)

  const actressMatchesOrig = [...html.matchAll(/\/mono\/actress\/\d+\/-\/"><span[^>]*>([^<]+)<\/span>/g)]
  console.log('actressMatches (original pattern):', actressMatchesOrig)

  // タイトル取得（強化版 - 属性順序・引用符種別に依存しない）
  let title = null

  // パターン1: property="og:title" が先
  const m1 = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  if (m1) title = m1[1].replace(/\s*[-|]\s*(FANZA|DMM)[^\n]*/i, '').trim()

  // パターン2: content が先に来る場合
  if (!title) {
    const m2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
    if (m2) title = m2[1].replace(/\s*[-|]\s*(FANZA|DMM)[^\n]*/i, '').trim()
  }

  // パターン3: <title>タグにフォールバック
  if (!title) {
    const m3 = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (m3) title = m3[1].replace(/\s*[-|]?\s*(FANZA|DMM)[^\n]*/i, '').trim()
  }

  console.log('resolved title:', title)
  if (!title) return null

  // 女優名取得（強化版 - 複数パターン順に試す）
  let actresses = []

  // パターン1: /mono/actress/ リンク（属性間スペース対応）
  const p1 = [...html.matchAll(/\/mono\/actress\/\d+\/-\/"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/g)]
  if (p1.length > 0) actresses = p1.map(m => m[1].trim())

  // パターン2: itemprop="name" を持つspan
  if (actresses.length === 0) {
    const p2 = [...html.matchAll(/itemprop=["']name["'][^>]*>([^<]{2,20})<\/span>/g)]
    actresses = p2.map(m => m[1].trim())
  }

  // パターン3: /actress/ を含むhref内のテキスト
  if (actresses.length === 0) {
    const p3 = [...html.matchAll(/<a[^>]+href=["'][^"']*\/actress\/[^"']*["'][^>]*>\s*([^<]{2,20})\s*<\/a>/g)]
    actresses = p3.map(m => m[1].trim()).filter(n => n.length >= 2)
  }

  // パターン4: JSON-LD の actor
  if (actresses.length === 0) {
    const jsonLdBlock = html.match(/"actor"\s*:\s*\[([\s\S]*?)\]/)
    if (jsonLdBlock) {
      const names = [...jsonLdBlock[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)]
      actresses = names.map(m => m[1])
    }
  }

  console.log('resolved actresses:', actresses)

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
