import { TYPE_META } from '../lib/payload'
import type { SavedQrEntry } from '../lib/history'

interface Props {
  entries: SavedQrEntry[]
  onSelect: (entry: SavedQrEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

const TYPE_LABELS = Object.fromEntries(TYPE_META.map((t) => [t.id, t.label]))

export default function HistoryPanel({ entries, onSelect, onRemove, onClear }: Props) {
  if (entries.length === 0) return null

  return (
    <section
      aria-labelledby="history-heading"
      className="no-print rounded-2xl bg-surface p-4 shadow-[0_1px_3px_rgba(17,20,38,0.06)] ring-1 ring-line sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="history-heading" className="font-display text-lg font-bold sm:text-xl">
            Recent codes ({entries.length})
          </h2>
          <p className="text-xs text-muted sm:text-sm">Saved in this browser. Tap any code to restore its content, style and title.</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-line bg-subtle/60 px-3 py-1.5 text-xs font-semibold text-ink hover:border-bad hover:text-bad"
        >
          Clear all
        </button>
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {entries.map((entry) => {
          const fg = entry.style.color
          const fg2 = entry.style.gradient ? entry.style.color2 : undefined
          const bg = entry.style.transparent ? '#ffffff' : entry.style.background
          return (
            <li
              key={entry.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-2.5 transition-colors hover:border-ink"
            >
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  aria-hidden="true"
                  className="relative flex size-9 shrink-0 items-center justify-center rounded-md ring-1 ring-line"
                  style={{ background: `linear-gradient(135deg, ${fg} 0 55%, ${fg2 ?? bg} 55% 100%)` }}
                >
                  {entry.style.logo && (
                    <img src={entry.style.logo} alt="" className="size-5 rounded-sm bg-white object-contain p-0.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{entry.label}</span>
                  <span className="block text-xs text-muted">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Remove ${entry.label}`}
                title="Remove from recent"
                className="rounded-md p-1.5 text-muted hover:bg-desk hover:text-bad"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
