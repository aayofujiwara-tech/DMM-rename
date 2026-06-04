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
