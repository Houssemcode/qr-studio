import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_STYLE, PRESETS, toRenderOptions, toSafetyInput } from './style.ts'
import { checkScanSafety } from './scanSafety.ts'

describe('toRenderOptions', () => {
  it('scales the margin with the export size', () => {
    const s = { ...DEFAULT_STYLE, marginPct: 5 }
    assert.equal(toRenderOptions(s, 'x', 640, 'canvas').margin, 32)
    assert.equal(toRenderOptions(s, 'x', 2048, 'svg').margin, 102)
  })
  it('passes data, size and renderer through', () => {
    const o = toRenderOptions(DEFAULT_STYLE, 'hello', 1024, 'svg')
    assert.equal(o.data, 'hello')
    assert.equal(o.width, 1024)
    assert.equal(o.height, 1024)
    assert.equal(o.type, 'svg')
    assert.equal(o.qrOptions.errorCorrectionLevel, 'M')
  })
  it('sets an explicit undefined gradient so updates can clear it', () => {
    const o = toRenderOptions(DEFAULT_STYLE, 'x', 640, 'canvas')
    assert.ok('gradient' in o.dotsOptions)
    assert.equal(o.dotsOptions.gradient, undefined)
    assert.ok('image' in o)
    assert.equal(o.image, undefined)
  })
  it('builds a gradient with the angle in radians', () => {
    const o = toRenderOptions({ ...DEFAULT_STYLE, gradient: true, gradientAngle: 180, gradientType: 'radial' }, 'x', 640, 'canvas')
    assert.equal(o.dotsOptions.gradient?.type, 'radial')
    assert.ok(Math.abs((o.dotsOptions.gradient?.rotation ?? 0) - Math.PI) < 1e-9)
    assert.deepEqual(o.dotsOptions.gradient?.colorStops.map((c) => c.color), [DEFAULT_STYLE.color, DEFAULT_STYLE.color2])
  })
  it('lets the corners follow the dot colors unless customised', () => {
    const follow = toRenderOptions({ ...DEFAULT_STYLE, color: '#112233', eyeFrameColor: '#ff0000' }, 'x', 640, 'canvas')
    assert.equal(follow.cornersSquareOptions.color, '#112233')
    assert.equal(follow.cornersDotOptions.color, '#112233')
    const custom = toRenderOptions(
      { ...DEFAULT_STYLE, customEyeColors: true, eyeFrameColor: '#ff0000', eyeDotColor: '#00ff00', gradient: true },
      'x',
      640,
      'canvas',
    )
    assert.equal(custom.cornersSquareOptions.color, '#ff0000')
    assert.equal(custom.cornersDotOptions.color, '#00ff00')
    assert.equal(custom.cornersSquareOptions.gradient, undefined)
  })
  it('handles transparency and logos', () => {
    const o = toRenderOptions({ ...DEFAULT_STYLE, transparent: true, logo: 'data:image/png;base64,AAAA', logoSize: 0.3 }, 'x', 640, 'canvas')
    assert.equal(o.backgroundOptions.color, 'transparent')
    assert.equal(o.image, 'data:image/png;base64,AAAA')
    assert.equal(o.imageOptions.imageSize, 0.3)
  })
})

describe('presets and defaults', () => {
  it('ship defaults that pass the scan checks', () => {
    assert.deepEqual(checkScanSafety(toSafetyInput(DEFAULT_STYLE)), [])
  })
  it('every preset passes the scan checks', () => {
    for (const p of PRESETS) {
      const warnings = checkScanSafety(toSafetyInput({ ...DEFAULT_STYLE, ...p.patch }))
      assert.deepEqual(warnings, [], `${p.name} should be scannable`)
    }
  })
})
