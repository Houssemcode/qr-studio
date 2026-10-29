import { useCallback, useEffect, useMemo, useState } from 'react'
import ContentForm from './components/ContentForm'
import StylePanel from './components/StylePanel'
import PreviewSheet from './components/PreviewSheet'
import BatchPanel from './components/BatchPanel'
import HistoryPanel from './components/HistoryPanel'
import { DEFAULT_DATA, buildPayload, byteLength, capacityFor, fitsInQr } from './lib/payload'
import type { DataByType, QrType } from './lib/payload'
import { DEFAULT_STYLE, toSafetyInput } from './lib/style'
import type { StyleState } from './lib/style'
import { checkScanSafety } from './lib/scanSafety'
import { usePwaAndTheme } from './hooks/usePwaAndTheme'
import { useMiniQrCode } from './hooks/useQrCode'
import {
  addHistoryEntry,
  loadDraft,
  loadHistory,
  removeHistoryEntry,
  saveDraft,
  saveHistory,
  summarizeQrData,
} from './lib/history'
import type { SavedQrEntry } from './lib/history'

export default function App() {
  const initialDraft = useMemo(() => loadDraft(), [])

  const [type, setType] = useState<QrType>(() => initialDraft?.type ?? 'url')
  const [data, setData] = useState<DataByType>(() => initialDraft?.data ?? DEFAULT_DATA)
  const [style, setStyle] = useState<StyleState>(() => initialDraft?.style ?? DEFAULT_STYLE)
  const [caption, setCaption] = useState<string>(() => initialDraft?.caption ?? '')
  const [subcaption, setSubcaption] = useState<string>(() => initialDraft?.subcaption ?? '')
  const [history, setHistory] = useState<SavedQrEntry[]>(() => loadHistory())

  useEffect(() => {
    saveDraft({ type, data, style, caption, subcaption })
  }, [type, data, style, caption, subcaption])

  const patchData = useCallback(<T extends QrType>(t: T, patch: Partial<DataByType[T]>) => {
    setData((prev) => ({ ...prev, [t]: { ...prev[t], ...patch } }))
  }, [])

  const patchStyle = useCallback((patch: Partial<StyleState>) => {
    setStyle((prev) => ({ ...prev, ...patch }))
  }, [])

  const payload = useMemo(() => buildPayload(type, data[type]), [type, data])

  const { value, problem } = useMemo(() => {
    if (payload.problem || !payload.value) return payload
    if (!fitsInQr(payload.value, style.errorCorrection)) {
      return {
        value: '',
        problem: `This is too long for a QR code at this error correction level (${byteLength(payload.value)} of ${capacityFor(style.errorCorrection)} bytes). Shorten it, or lower the error correction under Scanning.`,
      }
    }
    return payload
  }, [payload, style.errorCorrection])

  const warnings = useMemo(() => checkScanSafety(toSafetyInput(style)), [style])

  const recordHistory = useCallback(() => {
    if (!value || problem) return
    setHistory((prev) => {
      const next = addHistoryEntry(prev, {
        label: summarizeQrData(type, data, caption),
        type,
        typeData: data[type],
        style,
        caption,
        subcaption,
      })
      saveHistory(next)
      return next
    })
  }, [value, problem, type, data, caption, subcaption, style])

  const handleSelectHistory = useCallback((entry: SavedQrEntry) => {
    setType(entry.type)
    setData((prev) => ({ ...prev, [entry.type]: entry.typeData }))
    setStyle(entry.style)
    setCaption(entry.caption)
    setSubcaption(entry.subcaption ?? '')
  }, [])

  const handleRemoveHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = removeHistoryEntry(prev, id)
      saveHistory(next)
      return next
    })
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  const loadSampleQr = useCallback(() => {
    setType('url')
    setData((prev) => ({ ...prev, url: { url: 'https://github.com/Houssemcode' } }))
    setStyle((prev) => ({
      ...prev,
      dotShape: 'rounded',
      eyeFrameShape: 'extra-rounded',
      eyeDotShape: 'dot',
      color: '#3b33f5',
      frameStyle: 'pill',
    }))
    setCaption('SCAN ME')
    setSubcaption('github.com/Houssemcode')
  }, [])

  const resetAll = useCallback(() => {
    setType('url')
    setData(DEFAULT_DATA)
    setStyle(DEFAULT_STYLE)
    setCaption('')
    setSubcaption('')
  }, [])

  const { theme, toggleTheme, isOnline, canInstall, promptInstall } = usePwaAndTheme()
  const hasReadyCode = Boolean(value && !problem)
  const miniQrRef = useMiniQrCode(value, style, hasReadyCode)
  const currentSummary = useMemo(() => summarizeQrData(type, data, caption), [type, data, caption])

  return (
    <div className="min-h-screen overflow-x-clip pb-24 lg:pb-0">
      <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs sm:size-9"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="3" height="3" rx="0.5" />
                <rect x="18" y="18" width="3" height="3" rx="0.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold tracking-tight text-ink sm:text-2xl">Quadra</h1>
                {isOnline ? (
                  <span className="hidden rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand sm:inline-block">
                    100% Client-Side · Offline Ready
                  </span>
                ) : (
                  <span
                    role="status"
                    className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-[10px] font-semibold text-ok sm:text-[11px]"
                  >
                    <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
                    Offline
                  </span>
                )}
              </div>
              <p className="hidden text-xs text-muted sm:block">
                Static QR codes that never expire · Nothing leaves your browser
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={promptInstall}
                className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-brand-deep sm:px-3"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={loadSampleQr}
              className="rounded-lg border border-line bg-subtle/70 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand hover:bg-surface hover:text-brand sm:px-3"
            >
              <span className="sm:hidden">Sample</span>
              <span className="hidden sm:inline">Try sample QR</span>
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ink hover:text-ink sm:px-3"
            >
              <span className="sm:hidden">Reset</span>
              <span className="hidden sm:inline">Start over</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex size-8 items-center justify-center rounded-lg border border-line bg-subtle/70 text-ink transition-colors hover:border-ink hover:bg-surface sm:size-8.5"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-5 px-3 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
        <div className="no-print min-w-0 space-y-5 sm:space-y-6 lg:col-start-1 lg:row-start-1">
          <ContentForm
            type={type}
            data={data}
            payloadValue={value}
            errorCorrection={style.errorCorrection}
            onTypeChange={setType}
            onPatch={patchData}
          />
          <StylePanel
            style={style}
            caption={caption}
            subcaption={subcaption}
            onCaptionChange={setCaption}
            onSubcaptionChange={setSubcaption}
            onPatch={patchStyle}
            onReset={() => {
              setStyle(DEFAULT_STYLE)
              setCaption('')
              setSubcaption('')
            }}
          />
          <BatchPanel style={style} defaultTitle={caption} subcaption={subcaption} />
          <HistoryPanel
            entries={history}
            onSelect={handleSelectHistory}
            onRemove={handleRemoveHistory}
            onClear={handleClearHistory}
          />
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <PreviewSheet
            value={value}
            problem={problem}
            style={style}
            warnings={warnings}
            fileBase={`qr-${type}`}
            caption={caption}
            subcaption={subcaption}
            onCaptionChange={setCaption}
            onSubcaptionChange={setSubcaption}
            onRecordHistory={recordHistory}
          />
        </div>
      </main>

      {/* Sticky mobile dock with live mini QR thumbnail so phone users see changes in real time */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(17,20,38,0.1)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2.5">
          <a href="#preview-sheet" className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-line ${
                hasReadyCode ? 'bg-white' : 'bg-subtle opacity-70'
              }`}
            >
              <div
                ref={miniQrRef}
                aria-hidden="true"
                className={`qr-slot size-full ${hasReadyCode ? '' : 'hidden'}`}
              />
              {!hasReadyCode && (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="text-muted" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="3" height="3" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${hasReadyCode ? 'bg-ok' : 'bg-line'}`}
                />
                <p className="truncate text-xs font-semibold text-ink">
                  {hasReadyCode ? currentSummary : 'Step 1: Enter content above'}
                </p>
              </div>
              <p className="truncate text-[11px] text-muted">
                {hasReadyCode ? 'Live preview · Tap to export PNG/SVG' : problem ?? 'Waiting for input'}
              </p>
            </div>
          </a>
          <a
            href="#preview-sheet"
            className="shrink-0 rounded-xl bg-brand px-3.5 py-2.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-brand-deep active:scale-95"
          >
            Export ↓
          </a>
        </div>
      </div>

      <footer className="no-print mx-auto max-w-6xl border-t border-line/70 px-4 py-8 text-xs text-muted sm:px-6 sm:text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            These codes are static. They hold your content directly, so they never expire and nothing can switch them off.
          </p>
          <p className="shrink-0">
            Created by{' '}
            <a
              href="https://github.com/Houssemcode"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink underline underline-offset-2 hover:text-brand"
            >
              Houssem Eddine Saifi
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
