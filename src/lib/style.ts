/**
 * Styling state for the code, and the function that turns it into
 * options for qr-code-styling. Kept free of the library itself so it can be tested.
 */

import type { ErrorCorrection } from './payload'
import type { SafetyInput } from './scanSafety'

export type DotShape = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'
export type EyeFrameShape = 'square' | 'extra-rounded' | 'dot'
export type EyeDotShape = 'square' | 'dot'
export type FrameStyle = 'none' | 'pill' | 'banner' | 'outline'

export interface StyleState {
  dotShape: DotShape
  color: string
  gradient: boolean
  color2: string
  gradientType: 'linear' | 'radial'
  /** degrees, 0 to 360 */
  gradientAngle: number

  eyeFrameShape: EyeFrameShape
  eyeDotShape: EyeDotShape
  /** When false the corner squares reuse the dot colors. */
  customEyeColors: boolean
  eyeFrameColor: string
  eyeDotColor: string

  background: string
  transparent: boolean
  /** Blank border, percent of the image width */
  marginPct: number
  errorCorrection: ErrorCorrection

  /** Data URL of the uploaded logo */
  logo: string | null
  /** Logo width as a share of the code width, 0.1 to 0.5 */
  logoSize: number
  hideDotsBehindLogo: boolean

  /** How the title / call-to-action under the QR code is framed */
  frameStyle: FrameStyle
}

export const DEFAULT_STYLE: StyleState = {
  dotShape: 'square',
  color: '#14172b',
  gradient: false,
  color2: '#3b33f5',
  gradientType: 'linear',
  gradientAngle: 45,

  eyeFrameShape: 'square',
  eyeDotShape: 'square',
  customEyeColors: false,
  eyeFrameColor: '#14172b',
  eyeDotColor: '#14172b',

  background: '#ffffff',
  transparent: false,
  marginPct: 6,
  errorCorrection: 'M',

  logo: null,
  logoSize: 0.22,
  hideDotsBehindLogo: true,

  frameStyle: 'none',
}

export interface CtaPreset {
  id: string
  title: string
  subtitle: string
  frameStyle: FrameStyle
}

export const CTA_PRESETS: CtaPreset[] = [
  { id: 'scan-me', title: 'SCAN ME', subtitle: 'Point your phone camera here', frameStyle: 'pill' },
  { id: 'menu', title: 'SCAN FOR MENU', subtitle: 'View dishes & prices on your phone', frameStyle: 'banner' },
  { id: 'wifi', title: 'CONNECT TO WI-FI', subtitle: 'Scan to join automatically', frameStyle: 'pill' },
  { id: 'contact', title: 'SAVE CONTACT', subtitle: 'Add directly to your address book', frameStyle: 'outline' },
  { id: 'location', title: 'OPEN IN MAPS', subtitle: 'Scan for directions', frameStyle: 'pill' },
  { id: 'website', title: 'VISIT WEBSITE', subtitle: 'Scan to open link', frameStyle: 'none' },
]

export interface Preset {
  id: string
  name: string
  patch: Partial<StyleState>
}

export const PRESETS: Preset[] = [
  { id: 'classic', name: 'Classic', patch: { color: '#000000', gradient: false, background: '#ffffff', customEyeColors: false, transparent: false } },
  { id: 'ultramarine', name: 'Ultramarine', patch: { color: '#3b33f5', gradient: false, background: '#ffffff', customEyeColors: false, transparent: false } },
  { id: 'forest', name: 'Forest', patch: { color: '#0f5132', gradient: false, background: '#f1f8f3', customEyeColors: false, transparent: false } },
  {
    id: 'sunset',
    name: 'Sunset',
    patch: { color: '#d62839', color2: '#5b1a8c', gradient: true, gradientType: 'linear', gradientAngle: 45, background: '#ffffff', customEyeColors: false, transparent: false },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    patch: { color: '#0077b6', color2: '#03045e', gradient: true, gradientType: 'radial', background: '#ffffff', customEyeColors: false, transparent: false },
  },
  { id: 'carbon', name: 'Carbon', patch: { color: '#1b1b1b', gradient: false, background: '#ececec', customEyeColors: false, transparent: false } },
]

/* ---------- options for qr-code-styling ---------- */

interface Gradient {
  type: 'linear' | 'radial'
  rotation: number
  colorStops: { offset: number; color: string }[]
}

export interface RenderOptions {
  type: 'canvas' | 'svg'
  width: number
  height: number
  margin: number
  data: string
  image: string | undefined
  qrOptions: { errorCorrectionLevel: ErrorCorrection }
  imageOptions: { hideBackgroundDots: boolean; imageSize: number; margin: number; crossOrigin: string }
  dotsOptions: { type: DotShape; color: string; gradient: Gradient | undefined }
  cornersSquareOptions: { type: EyeFrameShape; color: string; gradient: Gradient | undefined }
  cornersDotOptions: { type: EyeDotShape; color: string; gradient: Gradient | undefined }
  backgroundOptions: { color: string }
}

export function toRenderOptions(s: StyleState, data: string, px: number, renderer: 'canvas' | 'svg'): RenderOptions {
  const gradient: Gradient | undefined = s.gradient
    ? {
        type: s.gradientType,
        rotation: (s.gradientAngle * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: s.color },
          { offset: 1, color: s.color2 },
        ],
      }
    : undefined

  // Unset values are passed as explicit undefined so a later update() clears them.
  return {
    type: renderer,
    width: px,
    height: px,
    margin: Math.round((px * s.marginPct) / 100),
    data,
    image: s.logo ?? undefined,
    qrOptions: { errorCorrectionLevel: s.errorCorrection },
    imageOptions: {
      hideBackgroundDots: s.hideDotsBehindLogo,
      imageSize: s.logoSize,
      margin: Math.round(px * 0.012),
      crossOrigin: 'anonymous',
    },
    dotsOptions: { type: s.dotShape, color: s.color, gradient },
    cornersSquareOptions: {
      type: s.eyeFrameShape,
      color: s.customEyeColors ? s.eyeFrameColor : s.color,
      gradient: s.customEyeColors ? undefined : gradient,
    },
    cornersDotOptions: {
      type: s.eyeDotShape,
      color: s.customEyeColors ? s.eyeDotColor : s.color,
      gradient: s.customEyeColors ? undefined : gradient,
    },
    backgroundOptions: { color: s.transparent ? 'transparent' : s.background },
  }
}

export function toSafetyInput(s: StyleState): SafetyInput {
  return {
    foreground: s.gradient ? [s.color, s.color2] : [s.color],
    eyeColors: s.customEyeColors ? [s.eyeFrameColor, s.eyeDotColor] : [],
    background: s.transparent ? '#ffffff' : s.background,
    transparentBackground: s.transparent,
    hasLogo: s.logo !== null,
    logoSize: s.logoSize,
    errorCorrection: s.errorCorrection,
    marginPct: s.marginPct,
  }
}
