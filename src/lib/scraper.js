const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BASE_URL = 'https://www.dmm.co.jp/digital/videoa/-/detail/=/cid='

function parseHtml(html) {
  // タイトル: og:titleメタタグから取得
  let title = ''
  const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)
  if (ogTitleMatch) {
    title = ogTitleMatch[1].trim()
  } else {
    // フォールバック: h1.item-ttl
    const h1Match = html.match(/<h1[^>]*class="[^"]*item-ttl[^"]*"[^>]*>([^<]+)<\/h1>/)
    if (h1Match) title = h1Match[1].trim()
  }

  // 女優名: /mono/actress/ リンクから取得
  const actresses = []
  const actressRe = /<a\s+href="\/mono\/actress\/[^"]*"[^>]*>([^<]+)<\/a>/g
  let m
  while ((m = actressRe.exec(html)) !== null) {
    const name = m[1].trim()
    if (name && !actresses.includes(name)) actresses.push(name)
  }

  // フォールバック: span.actress
  if (actresses.length === 0) {
    const spanRe = /<span[^>]*class="[^"]*actress[^"]*"[^>]*>([^<]+)<\/span>/g
    while ((m = spanRe.exec(html)) !== null) {
      const name = m[1].trim()
      if (name && !actresses.includes(name)) actresses.push(name)
    }
  }

  if (!title) return null
  return { title, actresses }
}

export async function scrapeItem(cid) {
  const url = `${BASE_URL}${cid}/`
  let html
  try {
    html = await window.electron.fetchPage(url)
  } catch {
    throw new Error('NETWORK_ERROR')
  }
  return parseHtml(html)
}

export async function scrapeAll(files, onProgress) {
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let result

    try {
      const data = await scrapeItem(file.cid)
      result = data
        ? { ...file, status: 'ok', ...data }
        : { ...file, status: 'not_found' }
    } catch (e) {
      result = { ...file, status: 'error', error: e.message }
    }

    results.push(result)
    onProgress(i + 1, files.length, result)

    if (i < files.length - 1) await sleep(1000)
  }

  return results
}
