/**
 * Parses multi-line or CSV batch input into validated QR payloads and safe filenames.
 */

import { buildPayload, fitsInQr } from './payload'
import type { ErrorCorrection } from './payload'

export type BatchMode = 'url' | 'text'

export const MAX_BATCH_ITEMS = 200

export interface BatchItem {
  lineNumber: number
  rawContent: string
  /** Custom title to draw under this specific QR code (falls back to global title if empty) */
  title: string
  /** Resolved QR payload string (empty if problem is non-null) */
  payload: string
  /** Safe base filename without extension, e.g. "01-table-1" */
  fileBase: string
  problem: string | null
}

function splitRow(line: string): [string, string] {
  // Tab or pipe delimiter
  if (line.includes('\t')) {
    const idx = line.indexOf('\t')
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }
  if (line.includes('|')) {
    const idx = line.indexOf('|')
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }
  // Simple CSV (handles optional surrounding double quotes)
  const commaIdx = line.indexOf(',')
  if (commaIdx !== -1) {
    const left = line
      .slice(0, commaIdx)
      .trim()
      .replace(/^"(.*)"$/, '$1')
    const right = line
      .slice(commaIdx + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
    return [left, right]
  }
  return [line.trim(), '']
}

function isHeaderRow(left: string, right: string, isFirstNonEmpty: boolean): boolean {
  if (!isFirstNonEmpty || !right) return false
  const l = left.toLowerCase()
  const r = right.toLowerCase()
  return (
    (l === 'url' || l === 'link' || l === 'text' || l === 'content' || l === 'value') &&
    (r === 'title' || r === 'label' || r === 'name' || r === 'caption')
  )
}

export function slugifyFilePart(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40)
  return cleaned || 'qr'
}

export function parseBatchInput(
  raw: string,
  mode: BatchMode,
  errorCorrection: ErrorCorrection = 'M',
  defaultTitle = '',
): BatchItem[] {
  const lines = raw.split(/\r?\n/)
  const items: BatchItem[] = []
  let seenFirst = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue

    const [content, rowTitle] = splitRow(trimmed)
    if (isHeaderRow(content, rowTitle, !seenFirst)) {
      seenFirst = true
      continue
    }
    seenFirst = true

    const built =
      mode === 'url'
        ? buildPayload('url', { url: content })
        : buildPayload('text', { text: content })

    let problem = built.problem
    if (!problem && built.value && !fitsInQr(built.value, errorCorrection)) {
      problem = 'Too long for the selected error correction level.'
    }

    const indexPrefix = String(items.length + 1).padStart(2, '0')
    const title = rowTitle || defaultTitle.trim()
    const slugSource = rowTitle || content
    const fileBase = `${indexPrefix}-${slugifyFilePart(slugSource)}`

    items.push({
      lineNumber: i + 1,
      rawContent: content,
      title,
      payload: problem ? '' : built.value,
      fileBase,
      problem,
    })

    if (items.length >= MAX_BATCH_ITEMS) break
  }

  return items
}

export const SAMPLE_BATCH_CSV = `https://example.com/menu?table=1, Table 1 — Scan for Menu
https://example.com/menu?table=2, Table 2 — Scan for Menu
https://example.com/menu?table=3, Table 3 — Scan for Menu
https://example.com/menu?table=4, Table 4 — Scan for Menu
https://example.com/menu?table=5, Patio — Scan for Menu`
