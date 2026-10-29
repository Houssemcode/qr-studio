import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DATA } from './payload.ts'
import { DEFAULT_STYLE } from './style.ts'
import {
  MAX_HISTORY_ITEMS,
  addHistoryEntry,
  parseHistory,
  removeHistoryEntry,
  summarizeQrData,
} from './history.ts'
import { BUILTIN_ICONS } from './icons.ts'

describe('summarizeQrData', () => {
  it('prefers the custom caption when given', () => {
    assert.equal(summarizeQrData('url', DEFAULT_DATA, 'Scan for Menu'), 'Scan for Menu')
  })

  it('summarizes URLs, Wi-Fi and contacts cleanly', () => {
    const d = {
      ...DEFAULT_DATA,
      url: { url: 'https://example.com/menu' },
      wifi: { ...DEFAULT_DATA.wifi, ssid: 'CafeGuest' },
      vcard: { ...DEFAULT_DATA.vcard, firstName: 'Nadia', lastName: 'Bensalem' },
    }
    assert.equal(summarizeQrData('url', d), 'example.com/menu')
    assert.equal(summarizeQrData('wifi', d), 'Wi-Fi: CafeGuest')
    assert.equal(summarizeQrData('vcard', d), 'Nadia Bensalem')
  })
})

describe('history list operations', () => {
  it('adds items to the front and deduplicates identical codes', () => {
    let list = addHistoryEntry(
      [],
      {
        label: 'example.com',
        type: 'url',
        typeData: { url: 'https://example.com' },
        style: DEFAULT_STYLE,
        caption: '',
      },
      1000,
    )
    assert.equal(list.length, 1)
    const firstId = list[0].id

    list = addHistoryEntry(
      list,
      {
        label: 'other.org',
        type: 'url',
        typeData: { url: 'https://other.org' },
        style: DEFAULT_STYLE,
        caption: '',
      },
      2000,
    )
    assert.equal(list.length, 2)
    assert.equal(list[0].label, 'other.org')

    // Re-adding the first one moves it to the top and keeps its id
    list = addHistoryEntry(
      list,
      {
        label: 'example.com',
        type: 'url',
        typeData: { url: 'https://example.com' },
        style: DEFAULT_STYLE,
        caption: '',
      },
      3000,
    )
    assert.equal(list.length, 2)
    assert.equal(list[0].id, firstId)
    assert.equal(list[0].savedAt, 3000)
  })

  it('caps the history at MAX_HISTORY_ITEMS and removes by id', () => {
    let list = [] as ReturnType<typeof addHistoryEntry>
    for (let i = 0; i < MAX_HISTORY_ITEMS + 4; i++) {
      list = addHistoryEntry(
        list,
        {
          label: `item-${i}`,
          type: 'text',
          typeData: { text: `text-${i}` },
          style: DEFAULT_STYLE,
          caption: '',
        },
        i * 100,
      )
    }
    assert.equal(list.length, MAX_HISTORY_ITEMS)
    const targetId = list[0].id
    const afterRemove = removeHistoryEntry(list, targetId)
    assert.equal(afterRemove.length, MAX_HISTORY_ITEMS - 1)
    assert.ok(!afterRemove.some((e) => e.id === targetId))
  })

  it('parses valid history JSON and ignores corrupted input', () => {
    assert.deepEqual(parseHistory(null), [])
    assert.deepEqual(parseHistory('not-json'), [])
    assert.deepEqual(parseHistory('{"bad":true}'), [])

    const sample = addHistoryEntry(
      [],
      {
        label: 'Wi-Fi: Home',
        type: 'wifi',
        typeData: { ssid: 'Home', password: 'secret', security: 'WPA', hidden: false },
        style: DEFAULT_STYLE,
        caption: 'Home Wi-Fi',
      },
      5000,
    )
    const roundTrip = parseHistory(JSON.stringify(sample))
    assert.equal(roundTrip.length, 1)
    assert.equal(roundTrip[0].label, 'Wi-Fi: Home')
    assert.equal(roundTrip[0].caption, 'Home Wi-Fi')
  })
})

describe('built-in icons', () => {
  it('provides valid SVG data URLs with explicit pixel dimensions', () => {
    assert.ok(BUILTIN_ICONS.length >= 10)
    const ids = new Set<string>()
    for (const icon of BUILTIN_ICONS) {
      assert.ok(!ids.has(icon.id), `duplicate icon id: ${icon.id}`)
      ids.add(icon.id)
      assert.ok(icon.dataUrl.startsWith('data:image/svg+xml;utf8,'))
      const decoded = decodeURIComponent(icon.dataUrl.slice('data:image/svg+xml;utf8,'.length))
      assert.ok(decoded.includes('width="128"'))
      assert.ok(decoded.includes('height="128"'))
      assert.ok(decoded.includes('</svg>'))
    }
  })
})
