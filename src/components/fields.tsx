import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'

const inputBase =
  'min-w-0 w-full rounded-lg border border-line bg-subtle/60 px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-muted/65 hover:border-muted/60 focus:border-brand focus:bg-surface focus:outline-none focus:ring-3 focus:ring-brand/15 sm:text-sm'

interface FieldShellProps {
  id: string
  label: string
  hint?: string
  children: ReactNode
}

function FieldShell({ id, label, hint, children }: FieldShellProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'datetime-local'
  multiline?: boolean
  rows?: number
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'decimal'
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  multiline,
  rows = 4,
  autoComplete = 'off',
  inputMode,
}: TextFieldProps) {
  const id = useId()
  const common = {
    id,
    value,
    placeholder,
    autoComplete,
    dir: 'auto' as const,
    'aria-describedby': hint ? `${id}-hint` : undefined,
    className: inputBase,
  }
  return (
    <FieldShell id={id} label={label} hint={hint}>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  hint?: string
}

export function SelectField<T extends string>({ label, value, onChange, options, hint }: SelectFieldProps<T>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputBase}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface CheckFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}

export function CheckField({ label, checked, onChange, hint }: CheckFieldProps) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg py-1 text-sm font-medium text-ink select-none"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4.5 shrink-0 cursor-pointer rounded border-line accent-brand"
        />
        <span>{label}</span>
      </label>
      {hint && <p className="pl-7 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${id}-hex`} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <label
          aria-label={`${label} color swatch`}
          className="relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-line bg-subtle p-1 shadow-2xs transition-transform active:scale-95"
        >
          <input
            type="color"
            aria-label={`${label} picker`}
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className="size-full rounded-md ring-1 ring-line"
            style={{ backgroundColor: value }}
          />
        </label>
        <input
          id={`${id}-hex`}
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            const v = e.target.value.trim()
            setDraft(v)
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase())
          }}
          onBlur={() => setDraft(value)}
          className={`${inputBase} font-mono uppercase`}
        />
      </div>
    </div>
  )
}

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function RangeField({ label, value, min, max, step = 1, onChange, format }: RangeFieldProps) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="rounded-md bg-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-ink ring-1 ring-line">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer accent-brand"
      />
    </div>
  )
}

interface ChoiceOption<T extends string> {
  value: T
  label: string
  glyph?: ReactNode
}

interface ChoiceGroupProps<T extends string> {
  label: string
  value: T
  options: ChoiceOption<T>[]
  onChange: (value: T) => void
}

/** A responsive grid of buttons where exactly one is selected. */
export function ChoiceGroup<T extends string>({ label, value, options, onChange }: ChoiceGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs font-medium transition-all sm:min-w-[5.25rem] sm:px-3 ${
                active
                  ? 'border-brand bg-brand text-white shadow-xs'
                  : 'border-line bg-subtle/40 text-ink hover:border-ink hover:bg-surface'
              }`}
            >
              {o.glyph}
              <span className="truncate max-w-full">{o.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
