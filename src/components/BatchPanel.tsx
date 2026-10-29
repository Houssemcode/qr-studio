import { useMemo, useRef, useState } from 'react'
import { MAX_BATCH_ITEMS, SAMPLE_BATCH_CSV, parseBatchInput } from '../lib/batch'
import type { BatchMode } from '../lib/batch'
import { createZipArchive } from '../lib/zip'
import { renderQrBlob, triggerBlobDownload } from '../hooks/useQrCode'
import type { ExportFormat } from '../hooks/useQrCode'
import type { StyleState } from '../lib/style'

interface Props {
  style: StyleState
  defaultTitle: string
  subcaption: string
}

export default function BatchPanel({ style, defaultTitle, subcaption }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<BatchMode>('url')
  const [rawText, setRawText] = useState('')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [px, setPx] = useState(1024)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(
    () => parseBatchInput(rawText, mode, style.errorCorrection, defaultTitle),
    [rawText, mode, style.errorCorrection, defaultTitle],
  )

  const validItems = useMemo(() => items.filter((i) => !i.problem && i.payload), [items])
  const invalidItems = useMemo(() => items.filter((i) => i.problem !== null), [items])

  function onCsvUpload(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setRawText(String(reader.result ?? ''))
      setStatus(null)
    }
    reader.onerror = () => {
      setStatus({ ok: false, text: 'Could not read that CSV or text file.' })
    }
    reader.readAsText(file)
  }

  async function downloadBatchZip() {
    if (validItems.length === 0 || progress !== null) return
    setStatus(null)
    setProgress({ current: 0, total: validItems.length })

    try {
      const entries: { name: string; data: Uint8Array }[] = []
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i]
        setProgress({ current: i + 1, total: validItems.length })
        const blob = await renderQrBlob(item.payload, style, format, px, item.title, subcaption)
        const buffer = await blob.arrayBuffer()
        entries.push({
          name: `${item.fileBase}.${format}`,
          data: new Uint8Array(buffer),
        })
      }

      const zipBytes = createZipArchive(entries)
      const zipBlob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' })
      triggerBlobDownload(zipBlob, `qr-batch-${validItems.length}-${format}.zip`)
      setStatus({
        ok: true,
        text: `Downloaded qr-batch-${validItems.length}-${format}.zip (${validItems.length} codes).`,
      })
    } catch {
      setStatus({
        ok: false,
        text: 'Batch generation failed. Try fewer items or a smaller PNG size.',
      })
    } finally {
      setProgress(null)
    }
  }

  return (
    <section
      aria-labelledby="batch-heading"
      className="no-print rounded-2xl bg-surface p-4 shadow-[0_1px_3px_rgba(17,20,38,0.06)] ring-1 ring-line sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand"
          >
            3
          </span>
          <div>
            <h2 id="batch-heading" className="font-display text-lg font-bold sm:text-xl">
              Batch generator (CSV to ZIP)
            </h2>
            <p className="text-xs text-muted sm:text-sm">
              Generate up to {MAX_BATCH_ITEMS} styled QR codes at once—each with its own custom title under the code.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-line bg-subtle/60 px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface"
        >
          {open ? 'Hide batch tool' : 'Open batch tool'}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2" role="group" aria-label="Batch content type">
              <button
                type="button"
                aria-pressed={mode === 'url'}
                onClick={() => setMode('url')}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'url' ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-ink'
                }`}
              >
                Web links
              </button>
              <button
                type="button"
                aria-pressed={mode === 'text'}
                onClick={() => setMode('text')}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === 'text' ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-ink'
                }`}
              >
                Plain text / IDs
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('url')
                  setRawText(SAMPLE_BATCH_CSV)
                  setStatus(null)
                }}
                className="text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-deep"
              >
                Load 5-table sample
              </button>
              <span className="text-line" aria-hidden="true">
                |
              </span>
              <input
                ref={fileInputRef}
                id="batch-csv-upload"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => onCsvUpload(e.target.files?.[0])}
                className="sr-only"
              />
              <label
                htmlFor="batch-csv-upload"
                className="cursor-pointer rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-ink"
              >
                Upload .csv or .txt
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="batch-textarea" className="block text-sm font-medium text-ink">
              One code per line: <code className="rounded bg-desk px-1.5 py-0.5 text-xs">content, Custom Title Under Code</code>
            </label>
            <textarea
              id="batch-textarea"
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                mode === 'url'
                  ? 'https://example.com/table-1, Table 1\nhttps://example.com/table-2, Table 2'
                  : 'INV-1001, Rack A — Shelf 1\nINV-1002, Rack A — Shelf 2'
              }
              className="w-full rounded-lg border border-line bg-subtle/60 px-3 py-2 font-mono text-base text-ink placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:outline-none sm:text-sm"
            />
            <p className="text-xs text-muted">
              The second column after a comma (or <code className="font-mono">|</code>) is optional—it sets both the file name and the title under that QR code. All codes use your current colors, shapes, logo and frame style.
            </p>
          </div>

          {items.length > 0 && (
            <div className="rounded-lg border border-line bg-desk/40 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {validItems.length} valid {validItems.length === 1 ? 'code' : 'codes'} ready
                  {invalidItems.length > 0 && (
                    <span className="ml-2 text-bad">({invalidItems.length} skipped with errors)</span>
                  )}
                </span>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText('')
                      setStatus(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-xs font-medium text-muted underline hover:text-ink"
                  >
                    Clear list
                  </button>
                )}
              </div>

              {invalidItems.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-bad">
                  {invalidItems.slice(0, 3).map((err) => (
                    <li key={err.lineNumber}>
                      Line {err.lineNumber} ({err.rawContent}): {err.problem}
                    </li>
                  ))}
                </ul>
              )}

              {validItems.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {validItems.slice(0, 4).map((item) => (
                    <li key={item.lineNumber} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-ink">
                        {item.fileBase}.{format}
                      </span>
                      <span className="truncate">
                        {item.title ? `Title: “${item.title}”` : 'No title under code'}
                      </span>
                    </li>
                  ))}
                  {validItems.length > 4 && <li>…and {validItems.length - 4} more</li>}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div>
                <label htmlFor="batch-format" className="mb-1 block text-xs font-medium text-muted">
                  Format
                </label>
                <select
                  id="batch-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-full rounded-lg border border-line bg-subtle/60 px-3 py-2 text-base text-ink sm:text-sm"
                >
                  <option value="png">PNG images</option>
                  <option value="svg">SVG vectors</option>
                </select>
              </div>

              {format === 'png' && (
                <div>
                  <label htmlFor="batch-size" className="mb-1 block text-xs font-medium text-muted">
                    PNG size
                  </label>
                  <select
                    id="batch-size"
                    value={px}
                    onChange={(e) => setPx(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-subtle/60 px-3 py-2 text-base text-ink sm:text-sm"
                  >
                    <option value={512}>512 px</option>
                    <option value={1024}>1024 px</option>
                    <option value={2048}>2048 px</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={validItems.length === 0 || progress !== null}
              onClick={downloadBatchZip}
              className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-muted sm:w-auto sm:py-2.5"
            >
              {progress
                ? `Generating ${progress.current} of ${progress.total}…`
                : `Download ${validItems.length || ''} ${validItems.length === 1 ? 'code' : 'codes'} (.zip)`}
            </button>
          </div>

          {status && (
            <p role="status" className={`text-sm font-medium ${status.ok ? 'text-ink' : 'text-bad'}`}>
              {status.text}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
