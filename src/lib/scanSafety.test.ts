import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkScanSafety, contrastRatio, hexToRgb } from './scanSafety.ts'

const base = {
  foreground: ['#000000'],
  eyeColors: ['#000000'],
  background: '#ffffff',
  hasLogo: false,
  logoSize: 0.25,
  errorCorrection: 'M' as const,
  marginPct: 6,
}
const ids = (o: Parameters<typeof checkScanSafety>[0]) => checkScanSafety(o).map((w) => w.id)

describe('contrast math', () => {
  it('matches known WCAG values', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21)
    assert.equal(contrastRatio('#777777', '#777777'), 1)
    assert.ok(Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.05)
  })
  it('parses short and long hex', () => {
    assert.deepEqual(hexToRgb('#fff'), [255, 255, 255])
    assert.deepEqual(hexToRgb('#3b33f5'), [59, 51, 245])
  })
})

describe('scan safety', () => {
  it('passes a plain black on white code', () => {
    assert.deepEqual(ids(base), [])
  })
  it('flags colors too close to the background as an error', () => {
    const w = checkScanSafety({ ...base, foreground: ['#dddddd'], eyeColors: ['#dddddd'] })
    assert.equal(w[0].id, 'contrast-low')
    assert.equal(w[0].level, 'error')
  })
  it('flags weak contrast on any gradient stop or eye color', () => {
    assert.ok(ids({ ...base, foreground: ['#000000', '#999999'] }).includes('contrast-mid'))
    assert.ok(ids({ ...base, eyeColors: ['#999999'] }).includes('contrast-mid'))
  })
  it('flags inverted colors', () => {
    assert.ok(ids({ ...base, foreground: ['#ffffff'], eyeColors: ['#ffffff'], background: '#000000' }).includes('inverted'))
  })
  it('flags oversized logos and weak error correction', () => {
    assert.ok(ids({ ...base, hasLogo: true, logoSize: 0.45 }).includes('logo-big'))
    assert.ok(ids({ ...base, hasLogo: true, logoSize: 0.35, errorCorrection: 'Q' }).includes('logo-ecc'))
    assert.ok(ids({ ...base, hasLogo: true, logoSize: 0.2, errorCorrection: 'L' }).includes('logo-ecc-low'))
    assert.deepEqual(ids({ ...base, hasLogo: true, logoSize: 0.3, errorCorrection: 'H' }), [])
  })
  it('flags a tiny quiet zone', () => {
    assert.ok(ids({ ...base, marginPct: 1 }).includes('margin'))
  })
  it('warns about transparent backgrounds', () => {
    assert.ok(ids({ ...base, transparentBackground: true }).includes('transparent'))
  })
})
