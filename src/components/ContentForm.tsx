import { useState } from 'react'
import type { ReactNode } from 'react'
import { CheckField, SelectField, TextField } from './fields'
import { TYPE_META, byteLength, capacityFor } from '../lib/payload'
import type { DataByType, ErrorCorrection, QrType } from '../lib/payload'

interface Props {
  type: QrType
  data: DataByType
  payloadValue: string
  errorCorrection: ErrorCorrection
  onTypeChange: (type: QrType) => void
  onPatch: <T extends QrType>(type: T, patch: Partial<DataByType[T]>) => void
}

type CategoryId = 'all' | 'popular' | 'connect' | 'business'

const CATEGORIES: { id: CategoryId; label: string; types?: QrType[] }[] = [
  { id: 'all', label: 'All (15)' },
  { id: 'popular', label: 'Popular', types: ['url', 'wifi', 'vcard', 'text', 'location'] },
  { id: 'connect', label: 'Chat & Social', types: ['whatsapp', 'social', 'email', 'phone', 'sms'] },
  { id: 'business', label: 'Pay & Events', types: ['payment', 'crypto', 'event', 'meeting', 'appstore'] },
]

function TypeIcon({ id }: { id: QrType }) {
  const paths: Record<QrType, ReactNode> = {
    url: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    text: (
      <>
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </>
    ),
    vcard: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
      </>
    ),
    email: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 7L2 7" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92Z" />
    ),
    sms: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    whatsapp: <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />,
    location: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    event: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    payment: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    crypto: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 8h4a2 2 0 0 1 0 4h-4v4h4.5a2 2 0 0 0 0-4" />
        <path d="M11 6v2m2-2v2m-2 8v2m2-2v2" />
      </>
    ),
    social: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
      </>
    ),
    appstore: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </>
    ),
    meeting: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m22 8-6 4 6 4V8Z" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {paths[id]}
    </svg>
  )
}

const MOBILE_PRIMARY_TYPES = new Set<QrType>(['url', 'wifi', 'vcard', 'text', 'whatsapp', 'location'])

export default function ContentForm({
  type,
  data,
  payloadValue,
  errorCorrection,
  onTypeChange,
  onPatch,
}: Props) {
  const [category, setCategory] = useState<CategoryId>('all')
  const [mobileShowAll, setMobileShowAll] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)

  const visibleTypes = TYPE_META.filter((t) => {
    const cat = CATEGORIES.find((c) => c.id === category)
    if (!cat?.types) return true
    return cat.types.includes(t.id) || t.id === type
  })

  const usedBytes = payloadValue ? byteLength(payloadValue) : 0
  const maxBytes = capacityFor(errorCorrection)
  const usagePct = Math.min(100, Math.round((usedBytes / maxBytes) * 100))

  async function copyPayloadText() {
    if (!payloadValue || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(payloadValue)
      setCopiedRaw(true)
      window.setTimeout(() => setCopiedRaw(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <section
      aria-labelledby="content-heading"
      className="rounded-2xl bg-surface p-4 shadow-[0_1px_3px_rgba(17,20,38,0.06)] ring-1 ring-line sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-brand-soft font-display text-sm font-bold text-brand"
          >
            1
          </span>
          <h2 id="content-heading" className="font-display text-lg font-bold sm:text-xl">
            What should the code do?
          </h2>
        </div>

        <div
          role="group"
          aria-label="Filter QR types"
          className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-lg bg-subtle p-1 ring-1 ring-line/60"
        >
          {CATEGORIES.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  active ? 'bg-surface text-ink shadow-2xs ring-1 ring-line/80' : 'text-muted hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {visibleTypes.map((t) => {
          const active = t.id === type
          const hideOnCompactMobile =
            category === 'all' && !mobileShowAll && !MOBILE_PRIMARY_TYPES.has(t.id) && !active
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => onTypeChange(t.id)}
              className={`group min-w-0 flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all sm:p-3 ${
                hideOnCompactMobile ? 'hidden sm:flex' : 'flex'
              } ${
                active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-subtle/40 text-ink hover:border-ink hover:bg-surface'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className={active ? 'text-white' : 'text-brand group-hover:text-ink'}>
                  <TypeIcon id={t.id} />
                </span>
                {active && <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />}
              </div>
              <span className="block truncate w-full text-xs font-semibold leading-tight sm:text-sm">{t.label}</span>
              <span
                className={`hidden text-xs leading-tight sm:block ${
                  active ? 'text-white/80' : 'text-muted'
                }`}
              >
                {t.hint}
              </span>
            </button>
          )
        })}
      </div>

      {category === 'all' && (
        <button
          type="button"
          onClick={() => setMobileShowAll((v) => !v)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-subtle/50 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface sm:hidden"
        >
          <span className="truncate">
            {mobileShowAll ? 'Show fewer QR types ▴' : 'Show all 15 QR types (Payment, Crypto, Social…) ▾'}
          </span>
        </button>
      )}

      <div className="mt-6 space-y-4 border-t border-line/70 pt-5">
        {type === 'url' && (
          <TextField
            label="Web address"
            type="url"
            inputMode="url"
            placeholder="example.com/menu"
            value={data.url.url}
            onChange={(url) => onPatch('url', { url })}
            hint="We add https:// automatically if it is missing."
          />
        )}

        {type === 'text' && (
          <TextField
            label="Text"
            multiline
            rows={4}
            placeholder="Write a note, serial code, or instructions…"
            value={data.text.text}
            onChange={(text) => onPatch('text', { text })}
            hint="Shorter text makes a simpler code that scans faster from a distance."
          />
        )}

        {type === 'email' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Send to"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={data.email.to}
                onChange={(to) => onPatch('email', { to })}
              />
              <TextField
                label="Subject (optional)"
                placeholder="Support request"
                value={data.email.subject}
                onChange={(subject) => onPatch('email', { subject })}
              />
            </div>
            <TextField
              label="Message (optional)"
              multiline
              rows={3}
              value={data.email.body}
              onChange={(body) => onPatch('email', { body })}
            />
          </>
        )}

        {type === 'phone' && (
          <TextField
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+213 555 12 34 56"
            value={data.phone.number}
            onChange={(number) => onPatch('phone', { number })}
            hint="Include the country code so it works from anywhere."
          />
        )}

        {type === 'sms' && (
          <>
            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              placeholder="+213 555 12 34 56"
              value={data.sms.number}
              onChange={(number) => onPatch('sms', { number })}
            />
            <TextField
              label="Message (optional)"
              multiline
              rows={3}
              value={data.sms.message}
              onChange={(message) => onPatch('sms', { message })}
            />
          </>
        )}

        {type === 'whatsapp' && (
          <>
            <TextField
              label="WhatsApp number"
              type="tel"
              inputMode="tel"
              placeholder="+213 555 12 34 56"
              value={data.whatsapp.number}
              onChange={(number) => onPatch('whatsapp', { number })}
              hint="Use the full number with country code."
            />
            <TextField
              label="First message (optional)"
              multiline
              rows={3}
              value={data.whatsapp.message}
              onChange={(message) => onPatch('whatsapp', { message })}
            />
          </>
        )}

        {type === 'wifi' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Network name (SSID)"
                placeholder="Cafe_Guest"
                value={data.wifi.ssid}
                onChange={(ssid) => onPatch('wifi', { ssid })}
              />
              <SelectField
                label="Security"
                value={data.wifi.security}
                onChange={(security) => onPatch('wifi', { security })}
                options={[
                  { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
                  { value: 'WEP', label: 'WEP (old routers)' },
                  { value: 'nopass', label: 'No password (open)' },
                ]}
              />
            </div>
            {data.wifi.security !== 'nopass' && (
              <TextField
                label="Wi-Fi Password"
                placeholder="Enter network password"
                value={data.wifi.password}
                onChange={(password) => onPatch('wifi', { password })}
              />
            )}
            <CheckField
              label="Hidden network"
              checked={data.wifi.hidden}
              onChange={(hidden) => onPatch('wifi', { hidden })}
              hint="Turn on if the network name is not broadcast in Wi-Fi lists."
            />
          </>
        )}

        {type === 'vcard' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="First name"
                autoComplete="given-name"
                value={data.vcard.firstName}
                onChange={(firstName) => onPatch('vcard', { firstName })}
              />
              <TextField
                label="Last name"
                autoComplete="family-name"
                value={data.vcard.lastName}
                onChange={(lastName) => onPatch('vcard', { lastName })}
              />
              <TextField
                label="Company"
                autoComplete="organization"
                value={data.vcard.organization}
                onChange={(organization) => onPatch('vcard', { organization })}
              />
              <TextField
                label="Job title"
                autoComplete="organization-title"
                value={data.vcard.jobTitle}
                onChange={(jobTitle) => onPatch('vcard', { jobTitle })}
              />
              <TextField
                label="Mobile"
                type="tel"
                inputMode="tel"
                value={data.vcard.mobile}
                onChange={(mobile) => onPatch('vcard', { mobile })}
              />
              <TextField
                label="Work phone"
                type="tel"
                inputMode="tel"
                value={data.vcard.workPhone}
                onChange={(workPhone) => onPatch('vcard', { workPhone })}
              />
              <TextField
                label="Email"
                type="email"
                inputMode="email"
                value={data.vcard.email}
                onChange={(email) => onPatch('vcard', { email })}
              />
              <TextField
                label="Website"
                type="url"
                inputMode="url"
                value={data.vcard.website}
                onChange={(website) => onPatch('vcard', { website })}
              />
            </div>
            <details className="rounded-xl border border-line bg-subtle/40 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-ink">Address and note (optional)</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    label="Street"
                    autoComplete="street-address"
                    value={data.vcard.street}
                    onChange={(street) => onPatch('vcard', { street })}
                  />
                </div>
                <TextField label="City" value={data.vcard.city} onChange={(city) => onPatch('vcard', { city })} />
                <TextField
                  label="Region or state"
                  value={data.vcard.region}
                  onChange={(region) => onPatch('vcard', { region })}
                />
                <TextField
                  label="Postal code"
                  value={data.vcard.postalCode}
                  onChange={(postalCode) => onPatch('vcard', { postalCode })}
                />
                <TextField
                  label="Country"
                  value={data.vcard.country}
                  onChange={(country) => onPatch('vcard', { country })}
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Note"
                    multiline
                    rows={2}
                    value={data.vcard.note}
                    onChange={(note) => onPatch('vcard', { note })}
                  />
                </div>
              </div>
            </details>
          </>
        )}

        {type === 'location' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Latitude"
                inputMode="decimal"
                placeholder="36.9000"
                value={data.location.latitude}
                onChange={(latitude) => onPatch('location', { latitude })}
              />
              <TextField
                label="Longitude"
                inputMode="decimal"
                placeholder="7.7667"
                value={data.location.longitude}
                onChange={(longitude) => onPatch('location', { longitude })}
              />
            </div>
            <SelectField
              label="Opens in"
              value={data.location.format}
              onChange={(format) => onPatch('location', { format })}
              options={[
                { value: 'maps', label: 'Google Maps link (works on every phone)' },
                { value: 'geo', label: 'Phone default map app (geo: link)' },
              ]}
              hint="In Google Maps, right-click any spot to copy its latitude and longitude."
            />
          </>
        )}

        {type === 'event' && (
          <>
            <TextField
              label="Event title"
              placeholder="Product Launch Meetup"
              value={data.event.title}
              onChange={(title) => onPatch('event', { title })}
            />
            <CheckField
              label="All-day event"
              checked={data.event.allDay}
              onChange={(allDay) => {
                const fix = (v: string, fallbackTime: string) =>
                  allDay ? v.slice(0, 10) : v && v.length === 10 ? `${v}T${fallbackTime}` : v
                onPatch('event', {
                  allDay,
                  start: fix(data.event.start, '09:00'),
                  end: fix(data.event.end, '10:00'),
                })
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={data.event.allDay ? 'Starts on' : 'Starts'}
                type={data.event.allDay ? 'date' : 'datetime-local'}
                value={data.event.start}
                onChange={(start) => onPatch('event', { start })}
              />
              <TextField
                label={data.event.allDay ? 'Ends on (optional)' : 'Ends (optional)'}
                type={data.event.allDay ? 'date' : 'datetime-local'}
                value={data.event.end}
                onChange={(end) => onPatch('event', { end })}
                hint={data.event.allDay ? undefined : 'Leave empty for a one-hour event.'}
              />
            </div>
            <TextField
              label="Location (optional)"
              placeholder="Room 4B or Conference Hall"
              value={data.event.location}
              onChange={(location) => onPatch('event', { location })}
            />
            <TextField
              label="Details (optional)"
              multiline
              rows={2}
              value={data.event.description}
              onChange={(description) => onPatch('event', { description })}
            />
          </>
        )}

        {type === 'payment' && (
          <>
            <SelectField
              label="Payment method"
              value={data.payment.method}
              onChange={(method) => onPatch('payment', { method })}
              options={[
                { value: 'sepa', label: 'SEPA bank transfer (European EPC QR)' },
                { value: 'paypal', label: 'PayPal.me link' },
                { value: 'upi', label: 'UPI instant payment (India)' },
              ]}
            />

            {data.payment.method === 'sepa' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Recipient name"
                    placeholder="Boulangerie Atlas SARL"
                    value={data.payment.recipientName}
                    onChange={(recipientName) => onPatch('payment', { recipientName })}
                  />
                  <TextField
                    label="IBAN"
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                    value={data.payment.iban}
                    onChange={(iban) => onPatch('payment', { iban })}
                  />
                  <TextField
                    label="BIC / SWIFT (optional)"
                    placeholder="AGRIFRPP"
                    value={data.payment.bic}
                    onChange={(bic) => onPatch('payment', { bic })}
                  />
                  <TextField
                    label="Amount in EUR (optional)"
                    inputMode="decimal"
                    placeholder="25.00"
                    value={data.payment.amount}
                    onChange={(amount) => onPatch('payment', { amount })}
                  />
                </div>
                <TextField
                  label="Payment reference (optional)"
                  placeholder="Invoice #2026-104"
                  value={data.payment.reference}
                  onChange={(reference) => onPatch('payment', { reference })}
                  hint="Scanned by European banking apps to pre-fill a SEPA credit transfer."
                />
              </>
            )}

            {data.payment.method === 'paypal' && (
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="PayPal.me username"
                  placeholder="yourname"
                  value={data.payment.paypalUser}
                  onChange={(paypalUser) => onPatch('payment', { paypalUser })}
                />
                <TextField
                  label="Amount (optional)"
                  inputMode="decimal"
                  placeholder="15.00"
                  value={data.payment.amount}
                  onChange={(amount) => onPatch('payment', { amount })}
                />
                <SelectField
                  label="Currency"
                  value={data.payment.currency}
                  onChange={(currency) => onPatch('payment', { currency })}
                  options={[
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'GBP', label: 'GBP (£)' },
                    { value: 'CAD', label: 'CAD ($)' },
                    { value: 'AUD', label: 'AUD ($)' },
                  ]}
                />
              </div>
            )}

            {data.payment.method === 'upi' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="UPI ID (VPA)"
                  placeholder="merchant@okaxis"
                  value={data.payment.upiId}
                  onChange={(upiId) => onPatch('payment', { upiId })}
                />
                <TextField
                  label="Payee name (optional)"
                  placeholder="Cafe Aroma"
                  value={data.payment.recipientName}
                  onChange={(recipientName) => onPatch('payment', { recipientName })}
                />
                <TextField
                  label="Amount in INR (optional)"
                  inputMode="decimal"
                  placeholder="250"
                  value={data.payment.amount}
                  onChange={(amount) => onPatch('payment', { amount })}
                />
                <TextField
                  label="Note (optional)"
                  placeholder="Order #12"
                  value={data.payment.reference}
                  onChange={(reference) => onPatch('payment', { reference })}
                />
              </div>
            )}
          </>
        )}

        {type === 'crypto' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Network / Coin"
                value={data.crypto.currency}
                onChange={(currency) => onPatch('crypto', { currency })}
                options={[
                  { value: 'bitcoin', label: 'Bitcoin (BTC)' },
                  { value: 'ethereum', label: 'Ethereum (ETH)' },
                  { value: 'solana', label: 'Solana (SOL)' },
                  { value: 'litecoin', label: 'Litecoin (LTC)' },
                ]}
              />
              <TextField
                label="Amount (optional)"
                inputMode="decimal"
                placeholder="0.015"
                value={data.crypto.amount}
                onChange={(amount) => onPatch('crypto', { amount })}
              />
            </div>
            <TextField
              label="Wallet address"
              placeholder={
                data.crypto.currency === 'bitcoin'
                  ? 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
                  : data.crypto.currency === 'ethereum'
                    ? '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
                    : 'Wallet public address'
              }
              value={data.crypto.address}
              onChange={(address) => onPatch('crypto', { address })}
              hint="Double-check the address before sharing or printing."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Label (optional)"
                placeholder="Donation"
                value={data.crypto.label}
                onChange={(label) => onPatch('crypto', { label })}
              />
              <TextField
                label="Message (optional)"
                placeholder="Thank you"
                value={data.crypto.message}
                onChange={(message) => onPatch('crypto', { message })}
              />
            </div>
          </>
        )}

        {type === 'social' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Platform"
              value={data.social.platform}
              onChange={(platform) => onPatch('social', { platform })}
              options={[
                { value: 'instagram', label: 'Instagram' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'telegram', label: 'Telegram' },
                { value: 'x', label: 'X (Twitter)' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'github', label: 'GitHub' },
              ]}
            />
            <TextField
              label="Username or profile URL"
              placeholder="@yourhandle"
              value={data.social.handle}
              onChange={(handle) => onPatch('social', { handle })}
              hint="Type your @handle or paste the full profile link."
            />
          </div>
        )}

        {type === 'appstore' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Store"
              value={data.appstore.platform}
              onChange={(platform) => onPatch('appstore', { platform })}
              options={[
                { value: 'apple', label: 'Apple App Store (iOS / macOS)' },
                { value: 'google', label: 'Google Play Store (Android)' },
              ]}
            />
            <TextField
              label={data.appstore.platform === 'apple' ? 'App ID or App Store link' : 'Package ID or Google Play link'}
              placeholder={data.appstore.platform === 'apple' ? '389801252 or https://apps.apple.com/…' : 'com.example.app'}
              value={data.appstore.appIdOrUrl}
              onChange={(appIdOrUrl) => onPatch('appstore', { appIdOrUrl })}
              hint={
                data.appstore.platform === 'apple'
                  ? 'Enter the numeric App ID (e.g. 389801252) or full App Store URL.'
                  : 'Enter the Android package name (e.g. org.mozilla.firefox) or Play Store URL.'
              }
            />
          </div>
        )}

        {type === 'meeting' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Service"
                value={data.meeting.platform}
                onChange={(platform) => onPatch('meeting', { platform })}
                options={[
                  { value: 'zoom', label: 'Zoom' },
                  { value: 'meet', label: 'Google Meet' },
                  { value: 'teams', label: 'Microsoft Teams' },
                ]}
              />
              <TextField
                label={
                  data.meeting.platform === 'zoom'
                    ? 'Zoom Meeting ID or link'
                    : data.meeting.platform === 'meet'
                      ? 'Meet code (abc-defg-hij) or link'
                      : 'Teams meeting link'
                }
                placeholder={
                  data.meeting.platform === 'zoom'
                    ? '812 3456 7890'
                    : data.meeting.platform === 'meet'
                      ? 'abc-defg-hij'
                      : 'https://teams.microsoft.com/l/meetup-join/…'
                }
                value={data.meeting.idOrUrl}
                onChange={(idOrUrl) => onPatch('meeting', { idOrUrl })}
              />
            </div>
            {data.meeting.platform === 'zoom' && (
              <TextField
                label="Zoom passcode (optional)"
                placeholder="123456"
                value={data.meeting.passcode}
                onChange={(passcode) => onPatch('meeting', { passcode })}
                hint="Included in the link so guests can join in one tap."
              />
            )}
          </>
        )}
      </div>

      {payloadValue && (
        <div className="mt-5 rounded-xl bg-subtle p-3 ring-1 ring-line/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 font-semibold text-muted">Encoded:</span>
              <code className="truncate font-mono text-ink" title={payloadValue}>
                {payloadValue.replace(/\n/g, ' ↵ ')}
              </code>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-muted" title="UTF-8 byte length vs maximum capacity">
                {usedBytes} / {maxBytes} B ({usagePct}%)
              </span>
              <button
                type="button"
                onClick={copyPayloadText}
                className="font-semibold text-brand hover:text-brand-deep"
              >
                {copiedRaw ? 'Copied!' : 'Copy text'}
              </button>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/60" aria-hidden="true">
            <div
              className={`h-full rounded-full transition-all ${
                usagePct > 80 ? 'bg-warn' : 'bg-brand'
              }`}
              style={{ width: `${Math.max(3, usagePct)}%` }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
