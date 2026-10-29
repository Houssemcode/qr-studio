/**
 * Minimal, zero-dependency ZIP archive builder (PKZIP 2.0, store method).
 * Runs in both the browser and Node so batch exports need no external zip library.
 */

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const prepared = entries.map((e) => {
    const nameBytes = encoder.encode(e.name)
    const crc = crc32(e.data)
    return { nameBytes, data: e.data, crc }
  })

  let localSize = 0
  let centralSize = 0
  for (const item of prepared) {
    localSize += 30 + item.nameBytes.length + item.data.length
    centralSize += 46 + item.nameBytes.length
  }

  const totalSize = localSize + centralSize + 22
  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)

  let localOffset = 0
  const offsets: number[] = []

  for (const item of prepared) {
    offsets.push(localOffset)
    const len = item.data.length
    const nameLen = item.nameBytes.length

    view.setUint32(localOffset, 0x04034b50, true) // Local file header signature
    view.setUint16(localOffset + 4, 20, true) // Version needed to extract (2.0)
    view.setUint16(localOffset + 6, 0x0800, true) // General purpose bit flag (UTF-8)
    view.setUint16(localOffset + 8, 0, true) // Compression method (0 = store)
    view.setUint16(localOffset + 10, 0, true) // Last mod file time
    view.setUint16(localOffset + 12, 0x21, true) // Last mod file date (1980-01-01)
    view.setUint32(localOffset + 14, item.crc, true) // CRC-32
    view.setUint32(localOffset + 18, len, true) // Compressed size
    view.setUint32(localOffset + 22, len, true) // Uncompressed size
    view.setUint16(localOffset + 26, nameLen, true) // File name length
    view.setUint16(localOffset + 28, 0, true) // Extra field length

    out.set(item.nameBytes, localOffset + 30)
    out.set(item.data, localOffset + 30 + nameLen)
    localOffset += 30 + nameLen + len
  }

  let centralOffset = localOffset
  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i]
    const len = item.data.length
    const nameLen = item.nameBytes.length

    view.setUint32(centralOffset, 0x02014b50, true) // Central directory file header signature
    view.setUint16(centralOffset + 4, 20, true) // Version made by
    view.setUint16(centralOffset + 6, 20, true) // Version needed to extract
    view.setUint16(centralOffset + 8, 0x0800, true) // General purpose bit flag (UTF-8)
    view.setUint16(centralOffset + 10, 0, true) // Compression method (0 = store)
    view.setUint16(centralOffset + 12, 0, true) // Last mod file time
    view.setUint16(centralOffset + 14, 0x21, true) // Last mod file date
    view.setUint32(centralOffset + 16, item.crc, true) // CRC-32
    view.setUint32(centralOffset + 20, len, true) // Compressed size
    view.setUint32(centralOffset + 24, len, true) // Uncompressed size
    view.setUint16(centralOffset + 28, nameLen, true) // File name length
    view.setUint16(centralOffset + 30, 0, true) // Extra field length
    view.setUint16(centralOffset + 32, 0, true) // File comment length
    view.setUint16(centralOffset + 34, 0, true) // Disk number start
    view.setUint16(centralOffset + 36, 0, true) // Internal file attributes
    view.setUint32(centralOffset + 38, 0, true) // External file attributes
    view.setUint32(centralOffset + 42, offsets[i], true) // Relative offset of local header

    out.set(item.nameBytes, centralOffset + 46)
    centralOffset += 46 + nameLen
  }

  // End of central directory record
  view.setUint32(centralOffset, 0x06054b50, true)
  view.setUint16(centralOffset + 4, 0, true) // Number of this disk
  view.setUint16(centralOffset + 6, 0, true) // Disk where central directory starts
  view.setUint16(centralOffset + 8, prepared.length, true) // Entries on this disk
  view.setUint16(centralOffset + 10, prepared.length, true) // Total entries
  view.setUint32(centralOffset + 12, centralSize, true) // Size of central directory
  view.setUint32(centralOffset + 16, localOffset, true) // Offset of start of central directory
  view.setUint16(centralOffset + 20, 0, true) // Comment length

  return out
}
