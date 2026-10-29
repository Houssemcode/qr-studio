import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { crc32, createZipArchive } from './zip.ts'
import { parseBatchInput, slugifyFilePart } from './batch.ts'

describe('zip archive builder', () => {
  it('computes standard IEEE 802.3 CRC-32', () => {
    const bytes = new TextEncoder().encode('123456789')
    assert.equal(crc32(bytes), 0xcbf43926)
  })

  it('builds a valid PKZIP archive with local headers, central directory and EOCD', () => {
    const encoder = new TextEncoder()
    const archive = createZipArchive([
      { name: '01-table-1.svg', data: encoder.encode('<svg></svg>') },
      { name: '02-table-2.svg', data: encoder.encode('<svg>2</svg>') },
    ])
    const view = new DataView(archive.buffer)
    // Local file header signature PK\x03\x04
    assert.equal(view.getUint32(0, true), 0x04034b50)
    // End of central directory signature PK\x05\x06 at the end - 22 bytes
    const eocdOffset = archive.length - 22
    assert.equal(view.getUint32(eocdOffset, true), 0x06054b50)
    // Total entries in archive = 2
    assert.equal(view.getUint16(eocdOffset + 10, true), 2)
  })
})

describe('batch parser', () => {
  it('skips CSV headers, parses custom titles and builds safe file names', () => {
    const csv = [
      'url,title',
      'example.com/t1, Table 1',
      'https://example.com/t2 | Patio Table',
      'bad url with spaces, Broken',
    ].join('\n')

    const items = parseBatchInput(csv, 'url', 'M', 'Default Title')
    assert.equal(items.length, 3)

    assert.equal(items[0].payload, 'https://example.com/t1')
    assert.equal(items[0].title, 'Table 1')
    assert.equal(items[0].fileBase, '01-table-1')
    assert.equal(items[0].problem, null)

    assert.equal(items[1].payload, 'https://example.com/t2')
    assert.equal(items[1].title, 'Patio Table')
    assert.equal(items[1].fileBase, '02-patio-table')

    assert.ok(items[2].problem)
  })

  it('uses the default title when a line only has a link or text', () => {
    const items = parseBatchInput('example.com/a\nexample.com/b', 'url', 'M', 'Scan Me')
    assert.equal(items.length, 2)
    assert.equal(items[0].title, 'Scan Me')
    assert.equal(items[0].fileBase, '01-example-com-a')
  })

  it('slugifies file names cleanly', () => {
    assert.equal(slugifyFilePart('https://example.com/Menu & Drinks!'), 'example-com-menu-drinks')
    assert.equal(slugifyFilePart('   '), 'qr')
  })
})
