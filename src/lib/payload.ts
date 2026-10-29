/**
 * Turns form data into the exact text a QR code should hold.
 * Pure functions only: no DOM, no React, so they are easy to test.
 */

export type QrType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'wifi'
  | 'vcard'
  | 'location'
  | 'event'
  | 'crypto'
  | 'payment'
  | 'social'
  | 'appstore'
  | 'meeting'

export interface UrlData { url: string }
export interface TextData { text: string }
export interface EmailData { to: string; subject: string; body: string }
export interface PhoneData { number: string }
export interface SmsData { number: string; message: string }
export interface WhatsappData { number: string; message: string }
export interface WifiData {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}
export interface VcardData {
  firstName: string
  lastName: string
  organization: string
  jobTitle: string
  mobile: string
  workPhone: string
  email: string
  website: string
  street: string
  city: string
  region: string
  postalCode: string
  country: string
  note: string
}
export interface LocationData {
  latitude: string
  longitude: string
  /** 'maps' opens in any phone's map app; 'geo' is the plain geo: link. */
  format: 'maps' | 'geo'
}
export interface EventData {
  title: string
  /** yyyy-mm-dd when allDay, otherwise yyyy-mm-ddThh:mm (datetime-local format) */
  start: string
  end: string
  allDay: boolean
  location: string
  description: string
}

export type CryptoCurrency = 'bitcoin' | 'ethereum' | 'solana' | 'litecoin'

export interface CryptoData {
  currency: CryptoCurrency
  address: string
  amount: string
  label: string
  message: string
}

export type PaymentMethod = 'sepa' | 'paypal' | 'upi'

export interface PaymentData {
  method: PaymentMethod
  recipientName: string
  iban: string
  bic: string
  paypalUser: string
  upiId: string
  amount: string
  currency: string
  reference: string
}

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'telegram'
  | 'x'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'github'

export interface SocialData {
  platform: SocialPlatform
  handle: string
}

export type AppStorePlatform = 'apple' | 'google'

export interface AppStoreData {
  platform: AppStorePlatform
  appIdOrUrl: string
}

export type MeetingPlatform = 'zoom' | 'meet' | 'teams'

export interface MeetingData {
  platform: MeetingPlatform
  idOrUrl: string
  passcode: string
}

export interface DataByType {
  url: UrlData
  text: TextData
  email: EmailData
  phone: PhoneData
  sms: SmsData
  whatsapp: WhatsappData
  wifi: WifiData
  vcard: VcardData
  location: LocationData
  event: EventData
  crypto: CryptoData
  payment: PaymentData
  social: SocialData
  appstore: AppStoreData
  meeting: MeetingData
}

export const DEFAULT_DATA: DataByType = {
  url: { url: '' },
  text: { text: '' },
  email: { to: '', subject: '', body: '' },
  phone: { number: '' },
  sms: { number: '', message: '' },
  whatsapp: { number: '', message: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  vcard: {
    firstName: '',
    lastName: '',
    organization: '',
    jobTitle: '',
    mobile: '',
    workPhone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    note: '',
  },
  location: { latitude: '', longitude: '', format: 'maps' },
  event: { title: '', start: '', end: '', allDay: false, location: '', description: '' },
  crypto: { currency: 'bitcoin', address: '', amount: '', label: '', message: '' },
  payment: {
    method: 'sepa',
    recipientName: '',
    iban: '',
    bic: '',
    paypalUser: '',
    upiId: '',
    amount: '',
    currency: 'EUR',
    reference: '',
  },
  social: { platform: 'instagram', handle: '' },
  appstore: { platform: 'apple', appIdOrUrl: '' },
  meeting: { platform: 'zoom', idOrUrl: '', passcode: '' },
}

export const TYPE_META: { id: QrType; label: string; hint: string }[] = [
  { id: 'url', label: 'Link', hint: 'Open a website' },
  { id: 'text', label: 'Text', hint: 'Show plain text' },
  { id: 'wifi', label: 'WiFi', hint: 'Join a network' },
  { id: 'vcard', label: 'Contact', hint: 'Save a contact card' },
  { id: 'email', label: 'Email', hint: 'Start a new email' },
  { id: 'phone', label: 'Phone', hint: 'Start a call' },
  { id: 'sms', label: 'SMS', hint: 'Start a text message' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Open a chat' },
  { id: 'location', label: 'Location', hint: 'Open a map pin' },
  { id: 'event', label: 'Event', hint: 'Add to calendar' },
  { id: 'payment', label: 'Payment', hint: 'SEPA, PayPal or UPI' },
  { id: 'crypto', label: 'Crypto', hint: 'BTC, ETH, SOL wallet' },
  { id: 'social', label: 'Social', hint: 'Instagram, TikTok, X…' },
  { id: 'appstore', label: 'App Store', hint: 'iOS or Android app' },
  { id: 'meeting', label: 'Meeting', hint: 'Zoom, Meet or Teams' },
]

export interface PayloadResult {
  /** The text to encode. Empty when the form is not ready. */
  value: string
  /** What is missing or wrong, written for the person filling the form. null when ready. */
  problem: string | null
}

const ready = (value: string): PayloadResult => ({ value, problem: null })
const blocked = (problem: string): PayloadResult => ({ value: '', problem })

/* ---------- helpers ---------- */

/** Collapse whitespace and drop line breaks for single-line fields. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()

/** Escape text for vCard / iCalendar TEXT values. */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Escape a value inside the WIFI: format. */
export function escapeWifi(s: string): string {
  return s.replace(/([\\;,:"])/g, '\\$1')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Add https:// when the person typed a bare domain. */
export function normalizeUrl(input: string): string {
  const v = input.trim()
  if (!v) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v
  if (/^(mailto|tel|sms|geo|market):/i.test(v)) return v
  return `https://${v}`
}

export function isValidUrl(input: string): boolean {
  const v = normalizeUrl(input)
  if (!v || /\s/.test(v)) return false
  try {
    const u = new URL(v)
    if (/^https?:$/.test(u.protocol)) {
      return u.hostname === 'localhost' || u.hostname.includes('.')
    }
    return true
  } catch {
    return false
  }
}

/** Keep digits, and a leading + if present. */
function cleanNumber(input: string): { plus: boolean; digits: string } {
  const t = input.trim()
  return { plus: t.startsWith('+'), digits: t.replace(/\D/g, '') }
}

function query(params: [string, string][]): string {
  const parts = params
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

/* ---------- date helpers for events ---------- */

const pad = (n: number) => String(n).padStart(2, '0')

function parseDateTime(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v.trim())
  if (!m) return null
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] }
}

function parseDate(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim())
  if (!m) return null
  return { y: +m[1], mo: +m[2], d: +m[3] }
}

const icsDateTime = (p: { y: number; mo: number; d: number; h: number; mi: number }) =>
  `${p.y}${pad(p.mo)}${pad(p.d)}T${pad(p.h)}${pad(p.mi)}00`

const icsDate = (p: { y: number; mo: number; d: number }) => `${p.y}${pad(p.mo)}${pad(p.d)}`

/** Add days/hours with calendar rollover (UTC math, no time zone surprises). */
function shift(p: { y: number; mo: number; d: number; h?: number; mi?: number }, days: number, hours = 0) {
  const t = new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h ?? 0, p.mi ?? 0) + days * 86_400_000 + hours * 3_600_000)
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
  }
}

/* ---------- builders ---------- */

const builders: { [K in QrType]: (d: DataByType[K]) => PayloadResult } = {
  url: ({ url }) => {
    if (!url.trim()) return blocked('Enter a link to create your code.')
    if (!isValidUrl(url)) return blocked('That does not look like a web address. Try example.com.')
    return ready(normalizeUrl(url))
  },

  text: ({ text }) => {
    if (!text.trim()) return blocked('Type some text to create your code.')
    return ready(text)
  },

  email: ({ to, subject, body }) => {
    const addr = to.trim()
    if (!addr) return blocked('Enter an email address to create your code.')
    if (!EMAIL_RE.test(addr)) return blocked('That email address looks incomplete.')
    return ready(`mailto:${addr}${query([['subject', subject.trim()], ['body', body.trim()]])}`)
  },

  phone: ({ number }) => {
    const { plus, digits } = cleanNumber(number)
    if (!number.trim()) return blocked('Enter a phone number to create your code.')
    if (digits.length < 3) return blocked('That phone number is too short.')
    return ready(`tel:${plus ? '+' : ''}${digits}`)
  },

  sms: ({ number, message }) => {
    const { plus, digits } = cleanNumber(number)
    if (!number.trim()) return blocked('Enter a phone number to create your code.')
    if (digits.length < 3) return blocked('That phone number is too short.')
    return ready(`sms:${plus ? '+' : ''}${digits}${query([['body', message.trim()]])}`)
  },

  whatsapp: ({ number, message }) => {
    const { digits } = cleanNumber(number)
    if (!number.trim()) return blocked('Enter a phone number with country code, like +213 555 12 34 56.')
    if (digits.length < 6 || digits.length > 15) {
      return blocked('Use the full number with country code, 6 to 15 digits.')
    }
    return ready(`https://wa.me/${digits}${query([['text', message.trim()]])}`)
  },

  wifi: ({ ssid, password, security, hidden }) => {
    const name = ssid.trim()
    if (!name) return blocked('Enter the network name to create your code.')
    if (security !== 'nopass' && !password) return blocked('Enter the WiFi password, or choose No password.')
    const parts = [`T:${security}`, `S:${escapeWifi(name)}`]
    if (security !== 'nopass') parts.push(`P:${escapeWifi(password)}`)
    if (hidden) parts.push('H:true')
    return ready(`WIFI:${parts.join(';')};;`)
  },

  vcard: (d) => {
    const first = oneLine(d.firstName)
    const last = oneLine(d.lastName)
    const org = oneLine(d.organization)
    if (!first && !last && !org) return blocked('Enter a name or company to create your card.')
    const email = d.email.trim()
    if (email && !EMAIL_RE.test(email)) return blocked('That email address looks incomplete.')
    const fullName = [first, last].filter(Boolean).join(' ') || org
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeText(last)};${escapeText(first)};;;`, `FN:${escapeText(fullName)}`]
    if (org) lines.push(`ORG:${escapeText(org)}`)
    if (oneLine(d.jobTitle)) lines.push(`TITLE:${escapeText(oneLine(d.jobTitle))}`)
    if (oneLine(d.mobile)) lines.push(`TEL;TYPE=CELL:${oneLine(d.mobile)}`)
    if (oneLine(d.workPhone)) lines.push(`TEL;TYPE=WORK,VOICE:${oneLine(d.workPhone)}`)
    if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`)
    if (d.website.trim()) lines.push(`URL:${normalizeUrl(oneLine(d.website))}`)
    const adr = [d.street, d.city, d.region, d.postalCode, d.country].map((x) => escapeText(oneLine(x)))
    if (adr.some(Boolean)) lines.push(`ADR;TYPE=WORK:;;${adr.join(';')}`)
    if (d.note.trim()) lines.push(`NOTE:${escapeText(d.note.trim())}`)
    lines.push('END:VCARD')
    return ready(lines.join('\n'))
  },

  location: ({ latitude, longitude, format }) => {
    if (!latitude.trim() || !longitude.trim()) return blocked('Enter a latitude and a longitude to create your code.')
    const lat = Number(latitude.trim().replace(',', '.'))
    const lng = Number(longitude.trim().replace(',', '.'))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return blocked('Latitude and longitude must be numbers.')
    if (lat < -90 || lat > 90) return blocked('Latitude must be between -90 and 90.')
    if (lng < -180 || lng > 180) return blocked('Longitude must be between -180 and 180.')
    return ready(format === 'geo' ? `geo:${lat},${lng}` : `https://www.google.com/maps?q=${lat},${lng}`)
  },

  event: ({ title, start, end, allDay, location, description }) => {
    if (!oneLine(title)) return blocked('Enter an event title to create your code.')
    if (!start.trim()) return blocked(allDay ? 'Pick the event date.' : 'Pick the start date and time.')

    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `SUMMARY:${escapeText(oneLine(title))}`]

    if (allDay) {
      const s = parseDate(start)
      if (!s) return blocked('Pick the event date.')
      const e = end.trim() ? parseDate(end) : s
      if (!e) return blocked('Pick a valid end date.')
      if (icsDate(e) < icsDate(s)) return blocked('The event ends before it starts.')
      // iCalendar all-day end dates are exclusive, so add one day.
      lines.push(`DTSTART;VALUE=DATE:${icsDate(s)}`, `DTEND;VALUE=DATE:${icsDate(shift(e, 1))}`)
    } else {
      const s = parseDateTime(start)
      if (!s) return blocked('Pick the start date and time.')
      let endStamp: string
      if (end.trim()) {
        const e = parseDateTime(end)
        if (!e) return blocked('Pick a valid end date and time.')
        endStamp = icsDateTime(e)
        if (endStamp < icsDateTime(s)) return blocked('The event ends before it starts.')
      } else {
        endStamp = icsDateTime(shift(s, 0, 1)) // default length: one hour
      }
      lines.push(`DTSTART:${icsDateTime(s)}`, `DTEND:${endStamp}`)
    }

    if (oneLine(location)) lines.push(`LOCATION:${escapeText(oneLine(location))}`)
    if (description.trim()) lines.push(`DESCRIPTION:${escapeText(description.trim())}`)
    lines.push('END:VEVENT', 'END:VCALENDAR')
    return ready(lines.join('\n'))
  },

  crypto: ({ currency, address, amount, label, message }) => {
    const addr = address.trim()
    if (!addr) return blocked('Enter a wallet address to create your code.')
    if (/\s/.test(addr) || addr.length < 20) {
      return blocked('That wallet address looks incomplete or contains spaces.')
    }
    let amtStr = ''
    if (amount.trim()) {
      const n = Number(amount.trim().replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) return blocked('Amount must be a positive number.')
      amtStr = String(n)
    }
    return ready(
      `${currency}:${addr}${query([
        ['amount', amtStr],
        ['label', oneLine(label)],
        ['message', oneLine(message)],
      ])}`,
    )
  },

  payment: ({ method, recipientName, iban, bic, paypalUser, upiId, amount, currency, reference }) => {
    let amtNum: number | null = null
    if (amount.trim()) {
      const n = Number(amount.trim().replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) return blocked('Amount must be a positive number.')
      amtNum = n
    }

    if (method === 'sepa') {
      const name = oneLine(recipientName).slice(0, 70)
      if (!name) return blocked('Enter the recipient name for the bank transfer.')
      const cleanIban = iban.replace(/\s+/g, '').toUpperCase()
      if (!cleanIban) return blocked('Enter the recipient IBAN.')
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleanIban)) {
        return blocked('That IBAN does not look valid. Check the country code and digits.')
      }
      const cleanBic = bic.replace(/\s+/g, '').toUpperCase()
      if (cleanBic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(cleanBic)) {
        return blocked('BIC / SWIFT code must be 8 or 11 characters.')
      }
      const eurAmount = amtNum !== null ? `EUR${amtNum.toFixed(2)}` : ''
      const rem = oneLine(reference).slice(0, 140)
      const lines = ['BCD', '002', '1', 'SCT', cleanBic, name, cleanIban, eurAmount, '', '', rem]
      return ready(lines.join('\n'))
    }

    if (method === 'paypal') {
      const user = paypalUser
        .trim()
        .replace(/^https?:\/\/(www\.)?paypal\.me\//i, '')
        .replace(/^@/, '')
        .replace(/\/+$/, '')
      if (!user) return blocked('Enter a PayPal.me username to create your code.')
      if (/[\s/]/.test(user)) return blocked('Enter only the PayPal.me username, without spaces.')
      const cur = currency.trim().toUpperCase() || 'EUR'
      const suffix = amtNum !== null ? `/${amtNum}${cur}` : ''
      return ready(`https://www.paypal.com/paypalme/${user}${suffix}`)
    }

    // UPI
    const vpa = upiId.trim()
    if (!vpa) return blocked('Enter a UPI ID (like merchant@upi) to create your code.')
    if (!/^[^\s@]+@[^\s@]+$/.test(vpa)) return blocked('A UPI ID should look like name@bank.')
    return ready(
      `upi://pay${query([
        ['pa', vpa],
        ['pn', oneLine(recipientName)],
        ['am', amtNum !== null ? amtNum.toFixed(2) : ''],
        ['cu', 'INR'],
        ['tn', oneLine(reference)],
      ])}`,
    )
  },

  social: ({ platform, handle }) => {
    const raw = handle.trim()
    if (!raw) return blocked('Enter a username or profile link to create your code.')
    if (/^https?:\/\//i.test(raw)) {
      if (!isValidUrl(raw)) return blocked('That profile link does not look valid.')
      return ready(normalizeUrl(raw))
    }
    const clean = raw.replace(/^@+/, '').replace(/\/+$/, '')
    if (!clean || /[\s/]/.test(clean)) {
      return blocked('Enter a username without spaces (or paste the full profile URL).')
    }
    const urls: Record<SocialPlatform, string> = {
      instagram: `https://www.instagram.com/${clean}`,
      tiktok: `https://www.tiktok.com/@${clean}`,
      telegram: `https://t.me/${clean}`,
      x: `https://x.com/${clean}`,
      linkedin: `https://www.linkedin.com/in/${clean}`,
      youtube: `https://www.youtube.com/@${clean}`,
      facebook: `https://www.facebook.com/${clean}`,
      github: `https://github.com/${clean}`,
    }
    return ready(urls[platform])
  },

  appstore: ({ platform, appIdOrUrl }) => {
    const raw = appIdOrUrl.trim()
    if (!raw) {
      return blocked(
        platform === 'apple'
          ? 'Enter an Apple App ID (like 123456789) or App Store link.'
          : 'Enter an Android package name (like com.example.app) or Google Play link.',
      )
    }
    if (/^https?:\/\//i.test(raw) || raw.includes('/')) {
      if (!isValidUrl(raw)) return blocked('That store link does not look valid.')
      return ready(normalizeUrl(raw))
    }
    if (platform === 'apple') {
      const digits = raw.replace(/^id/i, '')
      if (!/^\d{5,15}$/.test(digits)) {
        return blocked('An Apple App ID is 5 to 15 digits (like 389801252), or paste the full apps.apple.com link.')
      }
      return ready(`https://apps.apple.com/app/id${digits}`)
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(raw)) {
      return blocked('An Android package ID looks like com.company.app (or paste the play.google.com link).')
    }
    return ready(`https://play.google.com/store/apps/details?id=${raw}`)
  },

  meeting: ({ platform, idOrUrl, passcode }) => {
    const raw = idOrUrl.trim()
    if (!raw) return blocked('Enter a meeting ID or link to create your code.')
    const pwd = passcode.trim()

    if (/^https?:\/\//i.test(raw) || raw.includes('/')) {
      if (!isValidUrl(raw)) return blocked('That meeting link does not look valid.')
      const url = normalizeUrl(raw)
      if (platform === 'zoom' && pwd && !url.includes('pwd=')) {
        const sep = url.includes('?') ? '&' : '?'
        return ready(`${url}${sep}pwd=${encodeURIComponent(pwd)}`)
      }
      return ready(url)
    }

    if (platform === 'zoom') {
      const digits = raw.replace(/[\s-]+/g, '')
      if (!/^\d{9,11}$/.test(digits)) {
        return blocked('A Zoom Meeting ID is 9 to 11 digits (or paste the full Zoom link).')
      }
      return ready(`https://zoom.us/j/${digits}${query([['pwd', pwd]])}`)
    }

    if (platform === 'meet') {
      const code = raw.toLowerCase().replace(/\s+/g, '')
      if (!/^[a-z]{3}-?[a-z]{4}-?[a-z]{3}$/.test(code)) {
        return blocked('A Google Meet code looks like abc-defg-hij (or paste the full meet.google.com link).')
      }
      return ready(`https://meet.google.com/${code}`)
    }

    return blocked('Paste the full Microsoft Teams meeting link.')
  },
}

export function buildPayload<T extends QrType>(type: T, data: DataByType[T]): PayloadResult {
  return (builders[type] as (d: DataByType[T]) => PayloadResult)(data)
}

/* ---------- capacity ---------- */

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H'

/** Max bytes in a version 40 QR code, byte mode. */
const CAPACITY: Record<ErrorCorrection, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 }

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

export function fitsInQr(value: string, level: ErrorCorrection): boolean {
  return byteLength(value) <= CAPACITY[level]
}

export function capacityFor(level: ErrorCorrection): number {
  return CAPACITY[level]
}
