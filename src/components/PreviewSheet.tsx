import { useEffect, useState } from 'react'
import { useQrCode } from '../hooks/useQrCode'
import type { StyleState } from '../lib/style'
import type { SafetyWarning } from '../lib/scanSafety'

interface Props {
  /** The text the code holds. Empty when the form is not ready. */
  value: string
  /** Why there is no code yet, or null. */
  problem: string | null
  style: StyleState
  warnings: SafetyWarning[]
  fileBase: string
  caption: string
  subcaption: string
  onCaptionChange: (caption: string) => void
  onSubcaptionChange: (subcaption: string) => void
  onRecordHistory?: () => void
}

const SIZES = [
  { value: 512, short: '512 px', sub: 'Web' },
  { value: 1024, short: '1024 px', sub: 'Docs' },
  { value: 2048, short: '2048 px', sub: 'Print' },
]

/** Crop marks in the four corners, like a page in a print shop. */
function CropMarks() {
  const mark = 'absolute bg-ink/60'
  return (
    <>
      <span aria-hidden="true" className={`${mark} -left-2.5 top-3 h-px w-2.5`} />
      <span aria-hidden="true" className={`${mark} left-3 -top-2.5 h-2.5 w-px`} />
      <span aria-hidden="true" className={`${mark} -right-2.5 top-3 h-px w-2.5`} />
      <span aria-hidden="true" className={`${mark} right-3 -top-2.5 h-2.5 w-px`} />
      <span aria-hidden="true" className={`${mark} -left-2.5 bottom-3 h-px w-2.5`} />
      <span aria-hidden="true" className={`${mark} left-3 -bottom-2.5 h-2.5 w-px`} />
      <span aria-hidden="true" className={`${mark} -right-2.5 bottom-3 h-px w-2.5`} />
      <span aria-hidden="true" className={`${mark} right-3 -bottom-2.5 h-2.5 w-px`} />
    </>
  )
}

/** The four process inks, as printers check them on the edge of a sheet. */
function InkStrip() {
  return (
    <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full">
      <span className="flex-1 bg-[#00aeef]" />
      <span className="flex-1 bg-[#ec008c]" />
      <span className="flex-1 bg-[#ffe600]" />
      <span className="flex-1 bg-ink" />
    </div>
  )
}

const checker =
  'repeating-conic-gradient(#e3e5ef 0% 25%, #ffffff 0% 50%) 50% / 20px 20px'

export default function PreviewSheet({
  value,
  problem,
  style,
  warnings,
  fileBase,
  caption,
  subcaption,
  onCaptionChange,
  onSubcaptionChange,
  onRecordHistory,
}: Props) {
  const [size, setSize] = useState(1024)
  const [busy, setBusy] = useState<'png' | 'svg' | 'copy' | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const hasCode = value !== '' && problem === null
  const { containerRef, renderError, download, copyPng } = useQrCode(value, style, hasCode)

  useEffect(() => {
    if (!status) return
    const t = window.setTimeout(() => setStatus(null), 4000)
    return () => window.clearTimeout(t)
  }, [status])

  async function save(format: 'png' | 'svg') {
    setBusy(format)
    try {
      await download(format, size, fileBase, caption, subcaption)
      onRecordHistory?.()
      setStatus({ ok: true, text: `Saved ${fileBase}.${format}` })
    } catch {
      setStatus({ ok: false, text: 'The download failed. Try a smaller size, or try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function copyToClipboard() {
    setBusy('copy')
    try {
      await copyPng(size, caption, subcaption)
      onRecordHistory?.()
      setStatus({ ok: true, text: 'Copied PNG to clipboard.' })
    } catch {
      setStatus({ ok: false, text: 'Could not copy to clipboard in this browser. Try Download PNG instead.' })
    } finally {
      setBusy(null)
    }
  }

  function printSheet() {
    onRecordHistory?.()
    window.print()
  }

  function saveToRecent() {
    onRecordHistory?.()
    setStatus({ ok: true, text: 'Saved to Recent codes.' })
  }

  const canSave = hasCode && !renderError && busy === null
  const showCode = hasCode && !renderError
  const trimmedTitle = caption.trim()
  const trimmedSubtitle = subcaption.trim()
  const hasAnyText = Boolean(trimmedTitle || trimmedSubtitle)
  const contrastText = style.transparent ? '#ffffff' : style.background

  const hasErrorWarning = warnings.some((w) => w.level === 'error')

  return (
    <div id="preview-sheet" className="print-sheet mx-auto w-full max-w-sm lg:max-w-none">
      <div className="relative px-2.5 pb-2.5 pt-2.5">
        <CropMarks />
        <div className="relative rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(17,20,38,.06),0_14px_34px_-12px_rgba(17,20,38,.22)] ring-1 ring-line">
          <div className="no-print mb-3 flex items-center justify-between gap-2 text-xs">
            {showCode ? (
              hasErrorWarning ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-0.5 font-semibold text-bad">
                  <span className="size-1.5 rounded-full bg-bad" aria-hidden="true" />
                  Low scan contrast
                </span>
              ) : warnings.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-0.5 font-semibold text-warn">
                  <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />
                  Check scan warning
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-0.5 font-semibold text-ok">
                  <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
                  Scan-ready
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-0.5 font-medium text-muted ring-1 ring-line/60">
                Waiting for content
              </span>
            )}
            <span className="font-mono text-[11px] text-muted">EC:{style.errorCorrection}</span>
          </div>

          <div
            className={`relative w-full overflow-hidden rounded-xl ring-1 ring-line/60 ${showCode ? '' : 'hidden'}`}
            style={{
              ...(style.transparent ? { background: checker } : { backgroundColor: style.background }),
              ...(style.frameStyle === 'banner' && hasAnyText
                ? { border: `5px solid ${style.color}` }
                : style.frameStyle === 'outline'
                  ? { border: `4px solid ${style.color}`, borderRadius: '0.75rem' }
                  : {}),
            }}
          >
            {/* qr-code-styling draws into this element */}
            <div ref={containerRef} className="qr-slot aspect-square w-full" role="img" aria-label="Preview of your QR code" />

            {hasAnyText && style.frameStyle === 'banner' && (
              <div
                className="px-3 py-2.5 text-center"
                style={{ backgroundColor: style.color, color: contrastText }}
              >
                {trimmedTitle && (
                  <p className="font-display text-lg font-bold leading-tight break-words">{trimmedTitle}</p>
                )}
                {trimmedSubtitle && (
                  <p className="mt-0.5 text-xs font-medium leading-snug break-words opacity-95">{trimmedSubtitle}</p>
                )}
              </div>
            )}

            {hasAnyText && style.frameStyle === 'pill' && (
              <div className="flex flex-col items-center px-3 pb-3 pt-1 text-center">
                <span
                  className="inline-block max-w-full rounded-full px-5 py-1.5 font-display text-base font-bold leading-tight break-words"
                  style={{ backgroundColor: style.color, color: contrastText }}
                >
                  {trimmedTitle || trimmedSubtitle}
                </span>
                {trimmedTitle && trimmedSubtitle && (
                  <p
                    className="mt-1.5 text-xs font-medium leading-snug break-words"
                    style={{ color: style.color }}
                  >
                    {trimmedSubtitle}
                  </p>
                )}
              </div>
            )}

            {hasAnyText && (style.frameStyle === 'none' || style.frameStyle === 'outline') && (
              <div className="px-3 pb-3 pt-0.5 text-center" style={{ color: style.color }}>
                {trimmedTitle && (
                  <p className="font-display text-lg font-bold leading-snug break-words">{trimmedTitle}</p>
                )}
                {trimmedSubtitle && (
                  <p className="mt-0.5 text-xs font-medium leading-snug break-words">{trimmedSubtitle}</p>
                )}
              </div>
            )}
          </div>

          {!showCode && (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-subtle/50 px-6 text-center">
              <svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true" className="text-muted/60" fill="currentColor">
                <rect x="2" y="2" width="8" height="8" rx="1.5" />
                <rect x="14" y="2" width="8" height="8" rx="1.5" />
                <rect x="2" y="14" width="8" height="8" rx="1.5" />
                <rect x="14" y="14" width="3" height="3" />
                <rect x="19" y="19" width="3" height="3" />
              </svg>
              <p className="text-sm font-medium text-muted" role="status">
                {renderError ?? problem ?? 'Your code will appear here.'}
              </p>
            </div>
          )}

          <div className="mt-3.5">
            <InkStrip />
          </div>
        </div>
      </div>

      <div className="no-print mt-3 space-y-3">
        {warnings.length > 0 && (
          <ul className="space-y-1.5" aria-label="Scan checks">
            {warnings.map((w) => (
              <li
                key={w.id}
                className={`rounded-xl px-3 py-2 text-xs font-medium leading-relaxed ${
                  w.level === 'error' ? 'bg-bad-bg text-bad ring-1 ring-bad/20' : 'bg-warn-bg text-warn ring-1 ring-warn/20'
                }`}
              >
                {w.message}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl bg-surface p-3.5 shadow-2xs ring-1 ring-line space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label htmlFor="qr-caption" className="mb-1 block text-xs font-semibold text-ink">
                Title under QR code
              </label>
              <input
                id="qr-caption"
                type="text"
                maxLength={48}
                placeholder="e.g. SCAN ME or Table 12"
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                className="w-full rounded-lg border border-line bg-subtle/60 px-3 py-2 text-base text-ink placeholder:text-muted/65 focus:border-brand focus:bg-surface focus:outline-none sm:py-1.5 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="qr-subcaption" className="mb-1 block text-xs font-semibold text-ink">
                Custom text / subtitle
              </label>
              <input
                id="qr-subcaption"
                type="text"
                maxLength={64}
                placeholder="e.g. Point your phone camera here"
                value={subcaption}
                onChange={(e) => onSubcaptionChange(e.target.value)}
                className="w-full rounded-lg border border-line bg-subtle/60 px-3 py-2 text-base text-ink placeholder:text-muted/65 focus:border-brand focus:bg-surface focus:outline-none sm:py-1.5 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink">Export resolution (PNG)</span>
            <div role="group" aria-label="PNG export size" className="grid grid-cols-3 gap-1.5 rounded-xl bg-subtle p-1 ring-1 ring-line/60">
              {SIZES.map((s) => {
                const active = s.value === size
                return (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSize(s.value)}
                    className={`rounded-lg py-1.5 text-center transition-all ${
                      active
                        ? 'bg-surface font-semibold text-ink shadow-2xs ring-1 ring-line/80'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{s.short}</span>
                    <span className="block text-[10px] opacity-80">{s.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!canSave}
              onClick={() => save('png')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              <span>{busy === 'png' ? 'Saving…' : 'Download PNG'}</span>
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => save('svg')}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-surface px-3.5 py-3 text-sm font-semibold text-ink transition-all hover:bg-ink hover:text-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted"
            >
              <span>{busy === 'svg' ? 'Saving…' : 'Download SVG'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!canSave}
              onClick={copyToClipboard}
              className="rounded-lg border border-line bg-subtle/50 px-2.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
            >
              {busy === 'copy' ? 'Copying…' : 'Copy PNG'}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={printSheet}
              className="rounded-lg border border-line bg-subtle/50 px-2.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
            >
              Print sheet
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={saveToRecent}
              className="rounded-lg border border-line bg-subtle/50 px-2.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
            >
              Save recent
            </button>
          </div>

          <p className="min-h-4 text-center text-xs" role="status" aria-live="polite">
            {status ? (
              <span className={status.ok ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{status.text}</span>
            ) : (
              <span className="text-muted">SVG stays razor-sharp at any print size.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
