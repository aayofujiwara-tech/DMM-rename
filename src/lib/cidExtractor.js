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
