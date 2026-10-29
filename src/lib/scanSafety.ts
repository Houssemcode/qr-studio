/**
 * Checks that catch the most common reasons a styled QR code fails to scan.
 * Pure functions, no DOM.
 */

import type { ErrorCorrection } from './payload'

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full.padEnd(6, '0').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export interface SafetyInput {
  /** Every color the dots use (one, or all gradient stops). */
  foreground: string[]
  eyeColors: string[]
  background: string
  hasLogo: boolean
  /** Logo size as a share of the code width, 0.1 to 0.5 */
  logoSize: number
  errorCorrection: ErrorCorrection
  /** Blank border around the code, as a percent of the image width. */
  marginPct: number
  /** True when the background is see-through. */
  transparentBackground?: boolean
}

export interface SafetyWarning {
  id: string
  /** 'error' means it will probably not scan. 'warn' means it may fail on some phones. */
  level: 'error' | 'warn'
  message: string
}

export function checkScanSafety(i: SafetyInput): SafetyWarning[] {
  const out: SafetyWarning[] = []
  const all = [...i.foreground, ...i.eyeColors]

  const worst = Math.min(...all.map((c) => contrastRatio(c, i.background)))
  if (worst < 2) {
    out.push({ id: 'contrast-low', level: 'error', message: 'The code colors are too close to the background. Most phones will not scan it.' })
  } else if (worst < 3.5) {
    out.push({ id: 'contrast-mid', level: 'warn', message: 'Contrast is low. Use darker code colors or a lighter background.' })
  }

  // Scanners expect dark marks on a light background.
  const bgLum = luminance(i.background)
  if (worst >= 2 && all.some((c) => luminance(c) > bgLum)) {
    out.push({ id: 'inverted', level: 'warn', message: 'Light code on a dark background does not scan on some older apps. Test it first.' })
  }

  if (i.hasLogo) {
    if (i.logoSize > 0.4) {
      out.push({ id: 'logo-big', level: 'error', message: 'The logo covers too much of the code. Make it smaller.' })
    } else if (i.logoSize > 0.3 && i.errorCorrection !== 'H') {
      out.push({ id: 'logo-ecc', level: 'warn', message: 'A large logo needs the High error correction level.' })
    } else if (i.errorCorrection === 'L') {
      out.push({ id: 'logo-ecc-low', level: 'warn', message: 'With a logo, use Medium or higher error correction.' })
    }
  }

  if (i.transparentBackground) {
    out.push({ id: 'transparent', level: 'warn', message: 'A transparent background only scans when it is placed on a light surface.' })
  }

  if (i.marginPct < 4) {
    out.push({ id: 'margin', level: 'warn', message: 'Leave some blank space around the code. Scanners need a clear border.' })
  }

  return out
}
