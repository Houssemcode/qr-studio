import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckField, ChoiceGroup, ColorField, RangeField, SelectField, TextField } from './fields'
import { CTA_PRESETS, PRESETS } from '../lib/style'
import type { DotShape, EyeDotShape, EyeFrameShape, FrameStyle, StyleState } from '../lib/style'
import { BUILTIN_ICONS } from '../lib/icons'
import { capacityFor } from '../lib/payload'
import type { ErrorCorrection } from '../lib/payload'

interface Props {
  style: StyleState
  caption: string
  subcaption: string
  onCaptionChange: (caption: string) => void
  onSubcaptionChange: (subcaption: string) => void
  onPatch: (patch: Partial<StyleState>) => void
  onReset: () => void
}

type TabId = 'colors' | 'shapes' | 'logo' | 'frame' | 'scanning'

const TABS: { id: TabId; label: string }[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'logo', label: 'Logo' },
  { id: 'frame', label: 'Frame & text' },
  { id: 'scanning', label: 'Scanning' },
]

const MAX_LOGO_BYTES = 2 * 1024 * 1024

const G = 'currentColor'

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill={G}>
      {children}
    </svg>
  )
}

function dotGlyph(shape: DotShape) {
  const cells: [number, number][] = [
    [3, 3],
    [13, 3],
    [3, 13],
    [13, 13],
  ]
  return (
    <Glyph>
      {cells.map(([x, y], i) => {
        if (shape === 'dots') return <circle key={i} cx={x + 4} cy={y + 4} r={4.4} />
        if (shape === 'square') return <rect key={i} x={x} y={y} width={8} height={8} />
        if (shape === 'rounded') return <rect key={i} x={x} y={y} width={8} height={8} rx={2.4} />
        if (shape === 'extra-rounded') return <rect key={i} x={x} y={y} width={8} height={8} rx={4} />
        const r = shape === 'classy' ? 2.5 : 4
        const d = `M${x} ${y}H${x + 8 - r}Q${x + 8} ${y} ${x + 8} ${y + r}V${y + 8}H${x + r}Q${x} ${y + 8} ${x} ${y + 8 - r}Z`
        return <path key={i} d={d} />
      })}
    </Glyph>
  )
}

function frameGlyph(shape: EyeFrameShape) {
  const rx = shape === 'square' ? 0 : shape === 'extra-rounded' ? 6 : 11
  return (
    <Glyph>
      <rect x="3" y="3" width="18" height="18" rx={rx} fill="none" stroke={G} strokeWidth="3.6" />
    </Glyph>
  )
}

function eyeDotGlyph(shape: EyeDotShape) {
  return <Glyph>{shape === 'dot' ? <circle cx="12" cy="12" r="6" /> : <rect x="6" y="6" width="12" height="12" />}</Glyph>
}

const DOT_OPTIONS: { value: DotShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'extra-rounded', label: 'Soft' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy soft' },
]

const FRAME_OPTIONS: { value: EyeFrameShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Circle' },
]

const EYE_DOT_OPTIONS: { value: EyeDotShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Circle' },
]

function cardFrameGlyph(frame: FrameStyle) {
  return (
    <Glyph>
      <rect x="6" y="3" width="12" height="11" rx="1.5" fill="none" stroke={G} strokeWidth="2" />
      {frame === 'none' && <rect x="6" y="17.5" width="12" height="2.4" rx="1" />}
      {frame === 'pill' && <rect x="4" y="16.5" width="16" height="5" rx="2.5" />}
      {frame === 'banner' && (
        <>
          <rect x="3" y="2" width="18" height="20" rx="1.5" fill="none" stroke={G} strokeWidth="2" />
          <rect x="3" y="16" width="18" height="6" />
        </>
      )}
      {frame === 'outline' && (
        <>
          <rect x="3" y="2" width="18" height="20" rx="3" fill="none" stroke={G} strokeWidth="2" />
          <rect x="6" y="17" width="12" height="2.2" rx="1" />
        </>
      )}
    </Glyph>
  )
}

const CARD_FRAME_OPTIONS: { value: FrameStyle; label: string }[] = [
  { value: 'none', label: 'Plain text' },
  { value: 'pill', label: 'Pill badge' },
  { value: 'banner', label: 'Bottom banner' },
  { value: 'outline', label: 'Bordered card' },
]

const EC_LEVELS: { value: ErrorCorrection; title: string; recovery: string }[] = [
  { value: 'L', title: 'Low (L)', recovery: '~7% recovery' },
  { value: 'M', title: 'Medium (M)', recovery: '~15% recovery' },
  { value: 'Q', title: 'Quartile (Q)', recovery: '~25% recovery' },
  { value: 'H', title: 'High (H)', recovery: '~30% recovery' },
]

export default function StylePanel({
  style,
  caption,
  subcaption,
  onCaptionChange,
  onSubcaptionChange,
  onPatch,
  onReset,
}: Props) {
  const [tab, setTab] = useState<TabId>('colors')
  const [logoError, setLogoError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onLogoFile(file: File | undefined) {
    if (!file) return
    setLogoError(null)
    if (!/^image\/(png|jpeg|webp|svg\+xml|gif)$/.test(file.type)) {
      setLogoError('Choose a PNG, JPG, WebP, GIF or SVG image.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('That image is over 2 MB. Choose a smaller one.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const needsMoreProtection = style.errorCorrection === 'L' || style.errorCorrection === 'M'
      onPatch({
        logo: String(reader.result),
        ...(needsMoreProtection ? { errorCorrection: 'Q' as const } : {}),
      })
    }
    reader.onerror = () => setLogoError('That image could not be read. Try another file.')
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    onPatch({ logo: null })
    setLogoError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function selectBuiltinLogo(dataUrl: string) {
    setLogoError(null)
    if (fileRef.current) fileRef.current.value = ''
    if (style.logo === dataUrl) {
      onPatch({ logo: null })
      return
    }
    const needsMoreProtection = style.errorCorrection === 'L' || style.errorCorrection === 'M'
    onPatch({
      logo: dataUrl,
      ...(needsMoreProtection ? { errorCorrection: 'Q' as const } : {}),
    })
  }

  function hasTabBadge(id: TabId): boolean {
    if (id === 'logo') return style.logo !== null
    if (id === 'frame') return Boolean(caption.trim() || subcaption.trim() || style.frameStyle !== 'none')
    return false
  }

  return (
    <section
      aria-labelledby="style-heading"
      className="rounded-2xl bg-surface p-4 shadow-[0_1px_3px_rgba(17,20,38,0.06)] ring-1 ring-line sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand"
          >
            2
          </span>
          <h2 id="style-heading" className="font-display text-lg font-bold sm:text-xl">
            How should it look?
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-line bg-subtle/60 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-surface"
        >
          Reset style
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Style options"
        className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-xl bg-subtle p-1 ring-1 ring-line/60"
      >
        {TABS.map((t) => {
          const active = t.id === tab
          const badged = hasTabBadge(t.id)
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:gap-1.5 sm:px-3 sm:text-sm ${
                active
                  ? 'bg-surface text-ink shadow-2xs ring-1 ring-line/80'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>{t.label}</span>
              {badged && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-brand"
                />
              )}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5 space-y-5">
        {tab === 'colors' && (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Color themes</p>
                <button
                  type="button"
                  onClick={() =>
                    onPatch({
                      color: style.background,
                      background: style.color,
                      transparent: false,
                    })
                  }
                  className="text-xs font-semibold text-brand hover:text-brand-deep"
                >
                  ⇄ Swap code & background
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const fg = p.patch.color ?? '#000000'
                  const fg2 = p.patch.gradient ? p.patch.color2 : undefined
                  const bg = p.patch.background ?? '#ffffff'
                  const isCurrent =
                    style.color === fg &&
                    style.background === bg &&
                    Boolean(style.gradient) === Boolean(p.patch.gradient)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPatch(p.patch)}
                      className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-semibold transition-all ${
                        isCurrent
                          ? 'border-brand bg-brand-soft/60 text-ink ring-1 ring-brand'
                          : 'border-line bg-surface text-ink hover:border-ink'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="size-5 rounded-full ring-1 ring-line"
                        style={{ background: `linear-gradient(135deg, ${fg} 0 50%, ${fg2 ?? bg} 50% 100%)` }}
                      />
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label={style.gradient ? 'Code color (start)' : 'Code color'}
                value={style.color}
                onChange={(color) => onPatch({ color })}
              />
              {style.gradient ? (
                <ColorField
                  label="Code color (end)"
                  value={style.color2}
                  onChange={(color2) => onPatch({ color2 })}
                />
              ) : (
                <ColorField
                  label="Background color"
                  value={style.background}
                  onChange={(background) => onPatch({ background })}
                />
              )}
            </div>

            {style.gradient && (
              <ColorField
                label="Background color"
                value={style.background}
                onChange={(background) => onPatch({ background })}
              />
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-subtle/70 p-3.5 ring-1 ring-line/70">
              <CheckField
                label="Use a color gradient"
                checked={style.gradient}
                onChange={(gradient) => onPatch({ gradient })}
              />
              <CheckField
                label="Transparent background"
                checked={style.transparent}
                onChange={(transparent) => onPatch({ transparent })}
              />
              <CheckField
                label="Custom corner colors"
                checked={style.customEyeColors}
                onChange={(customEyeColors) => onPatch({ customEyeColors })}
              />
            </div>

            {style.gradient && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Gradient direction"
                  value={style.gradientType}
                  onChange={(gradientType) => onPatch({ gradientType })}
                  options={[
                    { value: 'linear', label: 'Linear (angled)' },
                    { value: 'radial', label: 'Radial (from center)' },
                  ]}
                />
                {style.gradientType === 'linear' && (
                  <RangeField
                    label="Gradient angle"
                    min={0}
                    max={360}
                    step={15}
                    value={style.gradientAngle}
                    onChange={(gradientAngle) => onPatch({ gradientAngle })}
                    format={(v) => `${v}°`}
                  />
                )}
              </div>
            )}

            {style.customEyeColors && (
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Corner outer frame"
                  value={style.eyeFrameColor}
                  onChange={(eyeFrameColor) => onPatch({ eyeFrameColor })}
                />
                <ColorField
                  label="Corner inner center"
                  value={style.eyeDotColor}
                  onChange={(eyeDotColor) => onPatch({ eyeDotColor })}
                />
              </div>
            )}
          </>
        )}

        {tab === 'shapes' && (
          <>
            <ChoiceGroup
              label="Module dots"
              value={style.dotShape}
              onChange={(dotShape) => onPatch({ dotShape })}
              options={DOT_OPTIONS.map((o) => ({ ...o, glyph: dotGlyph(o.value) }))}
            />
            <ChoiceGroup
              label="Corner outer frame"
              value={style.eyeFrameShape}
              onChange={(eyeFrameShape) => onPatch({ eyeFrameShape })}
              options={FRAME_OPTIONS.map((o) => ({ ...o, glyph: frameGlyph(o.value) }))}
            />
            <ChoiceGroup
              label="Corner inner center"
              value={style.eyeDotShape}
              onChange={(eyeDotShape) => onPatch({ eyeDotShape })}
              options={EYE_DOT_OPTIONS.map((o) => ({ ...o, glyph: eyeDotGlyph(o.value) }))}
            />
          </>
        )}

        {tab === 'logo' && (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Built-in center badges</p>
                {style.logo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-xs font-semibold text-bad hover:underline"
                  >
                    Remove active logo
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {BUILTIN_ICONS.map((icon) => {
                  const active = style.logo === icon.dataUrl
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectBuiltinLogo(icon.dataUrl)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-all ${
                        active
                          ? 'border-brand bg-brand text-white shadow-xs'
                          : 'border-line bg-subtle/40 text-ink hover:border-ink hover:bg-surface'
                      }`}
                    >
                      <img src={icon.dataUrl} alt="" aria-hidden="true" className="size-8 rounded-lg" />
                      <span className="truncate max-w-full">{icon.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Or upload your own image</p>
              <label
                htmlFor="logo-file"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  onLogoFile(e.dataTransfer.files?.[0])
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  dragging
                    ? 'border-brand bg-brand-soft/50'
                    : 'border-line bg-subtle/40 hover:border-ink hover:bg-surface'
                }`}
              >
                <input
                  ref={fileRef}
                  id="logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-brand">Click to choose an image, or drop it here</span>
                <span className="text-xs text-muted">PNG, SVG, JPG or WebP up to 2 MB · Stays 100% in your browser</span>
              </label>
              {logoError && (
                <p role="alert" className="text-sm font-medium text-bad">
                  {logoError}
                </p>
              )}
            </div>

            {style.logo && (
              <div className="space-y-4 rounded-xl bg-subtle/70 p-4 ring-1 ring-line/80">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={style.logo}
                      alt="Active center logo"
                      className="size-12 rounded-lg border border-line bg-white object-contain p-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink">Active center logo</p>
                      <p className="text-xs text-muted">Error correction raised automatically for safe scanning</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-bad hover:text-bad"
                  >
                    Remove
                  </button>
                </div>
                <RangeField
                  label="Logo size"
                  min={10}
                  max={45}
                  value={Math.round(style.logoSize * 100)}
                  onChange={(v) => onPatch({ logoSize: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <CheckField
                  label="Clear QR dots behind the logo"
                  checked={style.hideDotsBehindLogo}
                  onChange={(hideDotsBehindLogo) => onPatch({ hideDotsBehindLogo })}
                />
              </div>
            )}
          </>
        )}

        {tab === 'frame' && (
          <>
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">1-click Call-to-Action presets</p>
                {(caption || subcaption || style.frameStyle !== 'none') && (
                  <button
                    type="button"
                    onClick={() => {
                      onCaptionChange('')
                      onSubcaptionChange('')
                      onPatch({ frameStyle: 'none' })
                    }}
                    className="text-xs font-semibold text-brand hover:text-brand-deep"
                  >
                    Clear frame & text
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CTA_PRESETS.map((cta) => {
                  const active = caption === cta.title && style.frameStyle === cta.frameStyle
                  return (
                    <button
                      key={cta.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onCaptionChange(cta.title)
                        onSubcaptionChange(cta.subtitle)
                        onPatch({ frameStyle: cta.frameStyle })
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? 'border-brand bg-brand text-white shadow-xs'
                          : 'border-line bg-subtle/50 text-ink hover:border-ink hover:bg-surface'
                      }`}
                    >
                      {cta.title}
                    </button>
                  )
                })}
              </div>
            </div>

            <ChoiceGroup
              label="Frame style under the code"
              value={style.frameStyle}
              onChange={(frameStyle) => onPatch({ frameStyle })}
              options={CARD_FRAME_OPTIONS.map((o) => ({ ...o, glyph: cardFrameGlyph(o.value) }))}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Title under QR code"
                placeholder="e.g. SCAN ME or Table 12"
                value={caption}
                onChange={onCaptionChange}
                hint="Bold heading displayed below the QR code."
              />
              <TextField
                label="Custom text / subtitle under title"
                placeholder="e.g. Point your phone camera here"
                value={subcaption}
                onChange={onSubcaptionChange}
                hint="Optional second line below the title."
              />
            </div>
          </>
        )}

        {tab === 'scanning' && (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Error correction level</legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {EC_LEVELS.map((lv) => {
                  const active = style.errorCorrection === lv.value
                  return (
                    <button
                      key={lv.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onPatch({ errorCorrection: lv.value })}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                        active
                          ? 'border-brand bg-brand text-white shadow-xs'
                          : 'border-line bg-subtle/40 text-ink hover:border-ink hover:bg-surface'
                      }`}
                    >
                      <span className="text-sm font-bold">{lv.title}</span>
                      <span className={`text-xs ${active ? 'text-white/85' : 'text-muted'}`}>{lv.recovery}</span>
                      <span className={`mt-1 text-[11px] ${active ? 'text-white/75' : 'text-muted/80'}`}>
                        Up to {capacityFor(lv.value)} B
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted">
                Higher levels allow the code to scan even if partially covered by a logo or smudged in print, at the cost of smaller dots.
              </p>
            </fieldset>

            <RangeField
              label="Quiet zone (blank border)"
              min={0}
              max={12}
              value={style.marginPct}
              onChange={(marginPct) => onPatch({ marginPct })}
              format={(v) => `${v}%`}
            />
          </>
        )}
      </div>
    </section>
  )
}
