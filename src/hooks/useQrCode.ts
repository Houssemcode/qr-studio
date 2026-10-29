import { useCallback, useEffect, useRef, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { toRenderOptions } from '../lib/style'
import type { StyleState } from '../lib/style'

/** Pixel size of the on-screen preview. It is scaled down with CSS. */
const PREVIEW_PX = 640

type StylingOptions = NonNullable<ConstructorParameters<typeof QRCodeStyling>[0]>

const asStylingOptions = (o: ReturnType<typeof toRenderOptions>) => o as unknown as StylingOptions

export type ExportFormat = 'png' | 'svg'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function rawToBlob(raw: Blob | Buffer | null, mime: string): Promise<Blob> {
  if (!raw) throw new Error('Empty QR output')
  if (raw instanceof Blob) return raw
  return new Blob([new Uint8Array(raw)], { type: mime })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

async function composePngWithFrame(
  qrBlob: Blob,
  px: number,
  caption: string,
  subcaption: string,
  style: StyleState,
): Promise<Blob> {
  const title = caption.trim()
  const subtitle = subcaption.trim()
  const frame = style.frameStyle

  if (!title && !subtitle && frame === 'none') return qrBlob

  const hasBoth = Boolean(title && subtitle)
  const hasAnyText = Boolean(title || subtitle)
  const extraH = !hasAnyText ? 0 : hasBoth ? Math.round(px * 0.22) : Math.round(px * 0.15)
  const totalH = px + extraH

  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = totalH
  const ctx = canvas.getContext('2d')
  if (!ctx) return qrBlob

  const bgFill = style.transparent ? '#ffffff' : style.background
  if (!style.transparent) {
    ctx.fillStyle = style.background
    ctx.fillRect(0, 0, px, totalH)
  }

  const bmp = await createImageBitmap(qrBlob)
  ctx.drawImage(bmp, 0, 0, px, px)
  bmp.close?.()

  const titleFont = `700 ${Math.round(px * 0.048)}px "Bricolage Grotesque Variable", ui-sans-serif, system-ui, sans-serif`
  const subFont = `500 ${Math.round(px * 0.033)}px "Figtree Variable", ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (frame === 'banner' && hasAnyText) {
    const borderW = Math.round(px * 0.018)
    ctx.fillStyle = style.color
    ctx.fillRect(0, px, px, extraH)

    ctx.strokeStyle = style.color
    ctx.lineWidth = borderW
    ctx.strokeRect(borderW / 2, borderW / 2, px - borderW, totalH - borderW)

    ctx.fillStyle = bgFill
    if (hasBoth) {
      ctx.font = titleFont
      ctx.fillText(title, px / 2, px + extraH * 0.36, px * 0.88)
      ctx.font = subFont
      ctx.fillText(subtitle, px / 2, px + extraH * 0.72, px * 0.88)
    } else {
      ctx.font = title ? titleFont : subFont
      ctx.fillText(title || subtitle, px / 2, px + extraH * 0.5, px * 0.88)
    }
  } else if (frame === 'pill' && hasAnyText) {
    const pillText = title || subtitle
    ctx.font = titleFont
    const measured = ctx.measureText(pillText).width
    const pillW = Math.min(px * 0.88, Math.max(px * 0.44, measured + px * 0.14))
    const pillH = Math.round(px * 0.095)
    const pillX = (px - pillW) / 2
    const pillY = hasBoth ? px + Math.round(extraH * 0.08) : px + Math.round((extraH - pillH) * 0.42)

    ctx.fillStyle = style.color
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
    ctx.fill()

    ctx.fillStyle = bgFill
    ctx.fillText(pillText, px / 2, pillY + pillH / 2, pillW * 0.9)

    if (hasBoth) {
      ctx.fillStyle = style.color
      ctx.font = subFont
      ctx.fillText(subtitle, px / 2, pillY + pillH + Math.round(extraH * 0.25), px * 0.88)
    }
  } else {
    // 'none' or 'outline'
    if (hasBoth) {
      ctx.fillStyle = style.color
      ctx.font = titleFont
      ctx.fillText(title, px / 2, px + extraH * 0.34, px * 0.88)
      ctx.font = subFont
      ctx.fillText(subtitle, px / 2, px + extraH * 0.7, px * 0.88)
    } else if (hasAnyText) {
      ctx.fillStyle = style.color
      ctx.font = title ? titleFont : subFont
      ctx.fillText(title || subtitle, px / 2, px + extraH * 0.46, px * 0.88)
    }

    if (frame === 'outline') {
      const borderW = Math.round(px * 0.016)
      const inset = Math.round(px * 0.022)
      ctx.strokeStyle = style.color
      ctx.lineWidth = borderW
      drawRoundedRect(ctx, inset, inset, px - inset * 2, totalH - inset * 2, Math.round(px * 0.032))
      ctx.stroke()
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png')
  })
}

async function composeSvgWithFrame(
  svgBlob: Blob,
  px: number,
  caption: string,
  subcaption: string,
  style: StyleState,
): Promise<Blob> {
  const title = caption.trim()
  const subtitle = subcaption.trim()
  const frame = style.frameStyle

  if (!title && !subtitle && frame === 'none') return svgBlob

  const rawSvg = await svgBlob.text()
  const hasBoth = Boolean(title && subtitle)
  const hasAnyText = Boolean(title || subtitle)
  const extraH = !hasAnyText ? 0 : hasBoth ? Math.round(px * 0.22) : Math.round(px * 0.15)
  const totalH = px + extraH

  const titleSize = Math.round(px * 0.048)
  const subSize = Math.round(px * 0.033)
  const fg = escapeXml(style.color)
  const bg = escapeXml(style.transparent ? '#ffffff' : style.background)

  const parts: string[] = []
  if (!style.transparent && extraH > 0) {
    parts.push(`<rect x="0" y="${px - 1}" width="${px}" height="${extraH + 1}" fill="${bg}"/>`)
  }

  if (frame === 'banner' && hasAnyText) {
    const borderW = Math.round(px * 0.018)
    parts.push(`<rect x="0" y="${px}" width="${px}" height="${extraH}" fill="${fg}"/>`)
    parts.push(
      `<rect x="${borderW / 2}" y="${borderW / 2}" width="${px - borderW}" height="${totalH - borderW}" fill="none" stroke="${fg}" stroke-width="${borderW}"/>`,
    )
    if (hasBoth) {
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.42)}" text-anchor="middle" fill="${bg}" font-family="Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(title)}</text>`,
      )
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.78)}" text-anchor="middle" fill="${bg}" font-family="Figtree Variable, ui-sans-serif, system-ui, sans-serif" font-size="${subSize}" font-weight="500">${escapeXml(subtitle)}</text>`,
      )
    } else {
      const t = title || subtitle
      const sz = title ? titleSize : subSize
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.58)}" text-anchor="middle" fill="${bg}" font-family="Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif" font-size="${sz}" font-weight="700">${escapeXml(t)}</text>`,
      )
    }
  } else if (frame === 'pill' && hasAnyText) {
    const pillText = title || subtitle
    const approxTextW = pillText.length * titleSize * 0.56
    const pillW = Math.round(Math.min(px * 0.88, Math.max(px * 0.44, approxTextW + px * 0.12)))
    const pillH = Math.round(px * 0.095)
    const pillX = Math.round((px - pillW) / 2)
    const pillY = hasBoth ? px + Math.round(extraH * 0.08) : px + Math.round((extraH - pillH) * 0.42)
    const textY = Math.round(pillY + pillH * 0.66)

    parts.push(
      `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="${fg}"/>`,
    )
    parts.push(
      `<text x="${px / 2}" y="${textY}" text-anchor="middle" fill="${bg}" font-family="Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(pillText)}</text>`,
    )
    if (hasBoth) {
      parts.push(
        `<text x="${px / 2}" y="${Math.round(pillY + pillH + extraH * 0.28)}" text-anchor="middle" fill="${fg}" font-family="Figtree Variable, ui-sans-serif, system-ui, sans-serif" font-size="${subSize}" font-weight="500">${escapeXml(subtitle)}</text>`,
      )
    }
  } else {
    if (hasBoth) {
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.4)}" text-anchor="middle" fill="${fg}" font-family="Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif" font-size="${titleSize}" font-weight="700">${escapeXml(title)}</text>`,
      )
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.76)}" text-anchor="middle" fill="${fg}" font-family="Figtree Variable, ui-sans-serif, system-ui, sans-serif" font-size="${subSize}" font-weight="500">${escapeXml(subtitle)}</text>`,
      )
    } else if (hasAnyText) {
      const t = title || subtitle
      const sz = title ? titleSize : subSize
      parts.push(
        `<text x="${px / 2}" y="${Math.round(px + extraH * 0.55)}" text-anchor="middle" fill="${fg}" font-family="Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif" font-size="${sz}" font-weight="700">${escapeXml(t)}</text>`,
      )
    }

    if (frame === 'outline') {
      const borderW = Math.round(px * 0.016)
      const inset = Math.round(px * 0.022)
      const rx = Math.round(px * 0.032)
      parts.push(
        `<rect x="${inset}" y="${inset}" width="${px - inset * 2}" height="${totalH - inset * 2}" rx="${rx}" fill="none" stroke="${fg}" stroke-width="${borderW}"/>`,
      )
    }
  }

  const updated = rawSvg
    .replace(/height="\d+"/, `height="${totalH}"`)
    .replace(/viewBox="0 0 \d+ \d+"/, `viewBox="0 0 ${px} ${totalH}"`)
    .replace(/<\/svg>\s*$/, `${parts.join('')}</svg>`)

  return new Blob([updated], { type: 'image/svg+xml;charset=utf-8' })
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Renders a single QR code (with optional frame, title and subtitle) into a PNG or SVG Blob.
 * Used for both single-code exports and bulk ZIP generation.
 */
export async function renderQrBlob(
  value: string,
  style: StyleState,
  format: ExportFormat,
  px: number,
  caption = '',
  subcaption = '',
): Promise<Blob> {
  const options = asStylingOptions(toRenderOptions(style, value, px, format === 'svg' ? 'svg' : 'canvas'))
  const exporter = new QRCodeStyling(options)
  const raw = await exporter.getRawData(format)
  const baseBlob = await rawToBlob(raw, format === 'svg' ? 'image/svg+xml' : 'image/png')
  return format === 'svg'
    ? composeSvgWithFrame(baseBlob, px, caption, subcaption, style)
    : composePngWithFrame(baseBlob, px, caption, subcaption, style)
}

/**
 * Draws the code into a container, and exports or copies it at any size.
 * Pass an empty `value` to leave the last drawing alone (the caller hides it).
 */
export function useQrCode(value: string, style: StyleState, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    if (!value || !enabled) return
    const timer = window.setTimeout(() => {
      try {
        const options = asStylingOptions(toRenderOptions(style, value, PREVIEW_PX, 'canvas'))
        if (!qrRef.current) {
          qrRef.current = new QRCodeStyling(options)
          const el = containerRef.current
          if (el) {
            el.replaceChildren()
            qrRef.current.append(el)
          }
        } else {
          qrRef.current.update(options)
        }
        setRenderError(null)
      } catch {
        setRenderError('This code could not be drawn. Try shorter content or a lower error correction level.')
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [value, style, enabled])

  const download = useCallback(
    async (format: ExportFormat, px: number, fileName: string, caption = '', subcaption = '') => {
      if (!caption.trim() && !subcaption.trim() && style.frameStyle === 'none') {
        const options = asStylingOptions(toRenderOptions(style, value, px, format === 'svg' ? 'svg' : 'canvas'))
        const exporter = new QRCodeStyling(options)
        await exporter.download({ name: fileName, extension: format })
        return
      }
      const blob = await renderQrBlob(value, style, format, px, caption, subcaption)
      triggerBlobDownload(blob, `${fileName}.${format}`)
    },
    [style, value],
  )

  const copyPng = useCallback(
    async (px: number, caption = '', subcaption = '') => {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard image copy is not supported in this browser.')
      }
      const blob = await renderQrBlob(value, style, 'png', px, caption, subcaption)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    },
    [style, value],
  )

  return { containerRef, renderError, download, copyPng }
}

/**
 * Lightweight 128px live thumbnail for the sticky mobile bottom bar.
 */
export function useMiniQrCode(value: string, style: StyleState, enabled: boolean) {
  const miniRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!value || !enabled) return
    const timer = window.setTimeout(() => {
      try {
        const options = asStylingOptions(toRenderOptions(style, value, 128, 'canvas'))
        if (!qrRef.current) {
          qrRef.current = new QRCodeStyling(options)
          const el = miniRef.current
          if (el) {
            el.replaceChildren()
            qrRef.current.append(el)
          }
        } else {
          qrRef.current.update(options)
        }
      } catch {
        // Ignore preview errors in mini thumbnail
      }
    }, 140)
    return () => window.clearTimeout(timer)
  }, [value, style, enabled])

  return miniRef
}
