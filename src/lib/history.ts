/**
 * Local-storage history and draft persistence.
 * Pure functions handle serialization and deduplication so they can be tested in Node;
 * thin browser helpers wrap localStorage in try/catch.
 */

import { DEFAULT_DATA, TYPE_META } from './payload'
import type { DataByType, QrType } from './payload'
import { DEFAULT_STYLE } from './style'
import type { StyleState } from './style'

export const MAX_HISTORY_ITEMS = 12
const HISTORY_KEY = 'quadra:history:v1'
const DRAFT_KEY = 'quadra:draft:v1'

export interface SavedQrEntry {
  id: string
  label: string
  type: QrType
  typeData: DataByType[QrType]
  style: StyleState
  caption: string
  subcaption?: string
  savedAt: number
}

export interface DraftState {
  type: QrType
  data: DataByType
  style: StyleState
  caption: string
  subcaption: string
}

const VALID_TYPES = new Set<string>(TYPE_META.map((t) => t.id))

/** Builds a short, human-readable label for a saved QR code. */
export function summarizeQrData(type: QrType, data: DataByType, caption = ''): string {
  const trimmedCaption = caption.trim()
  if (trimmedCaption) return trimmedCaption

  switch (type) {
    case 'url':
      return data.url.url.trim().replace(/^https?:\/\//i, '') || 'Website'
    case 'text': {
      const t = data.text.text.trim().replace(/\s+/g, ' ')
      return t.length > 36 ? `${t.slice(0, 36)}…` : t || 'Text'
    }
    case 'email':
      return data.email.to.trim() || 'Email'
    case 'phone':
      return data.phone.number.trim() || 'Phone'
    case 'sms':
      return `SMS: ${data.sms.number.trim()}`
    case 'whatsapp':
      return `WhatsApp: ${data.whatsapp.number.trim()}`
    case 'wifi':
      return `Wi-Fi: ${data.wifi.ssid.trim() || 'Network'}`
    case 'vcard': {
      const full = [data.vcard.firstName.trim(), data.vcard.lastName.trim()].filter(Boolean).join(' ')
      return full || data.vcard.organization.trim() || 'Contact'
    }
    case 'location':
      return `${data.location.latitude.trim()}, ${data.location.longitude.trim()}`
    case 'event':
      return data.event.title.trim() || 'Event'
    case 'crypto': {
      const addr = data.crypto.address.trim()
      const short = addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
      return `${data.crypto.currency.toUpperCase()}: ${short || 'Wallet'}`
    }
    case 'payment':
      if (data.payment.method === 'sepa') return `SEPA: ${data.payment.recipientName.trim() || 'Transfer'}`
      if (data.payment.method === 'paypal') return `PayPal: ${data.payment.paypalUser.trim() || 'Me'}`
      return `UPI: ${data.payment.upiId.trim() || 'Pay'}`
    case 'social':
      return `${data.social.platform}: @${data.social.handle.trim().replace(/^@/, '')}`
    case 'appstore':
      return `${data.appstore.platform === 'apple' ? 'App Store' : 'Google Play'}: ${data.appstore.appIdOrUrl.trim()}`
    case 'meeting':
      return `${data.meeting.platform.toUpperCase()}: ${data.meeting.idOrUrl.trim()}`
  }
}

function signatureOf(entry: Pick<SavedQrEntry, 'type' | 'typeData' | 'style' | 'caption' | 'subcaption'>): string {
  return JSON.stringify([entry.type, entry.typeData, entry.style, entry.caption.trim(), (entry.subcaption ?? '').trim()])
}

export function addHistoryEntry(
  entries: SavedQrEntry[],
  input: Omit<SavedQrEntry, 'id' | 'savedAt'>,
  now = Date.now(),
): SavedQrEntry[] {
  const sig = signatureOf(input)
  const existing = entries.find((e) => signatureOf(e) === sig)
  const nextItem: SavedQrEntry = {
    ...input,
    caption: input.caption.trim(),
    subcaption: (input.subcaption ?? '').trim(),
    id: existing ? existing.id : `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: now,
  }
  const rest = entries.filter((e) => signatureOf(e) !== sig)
  return [nextItem, ...rest].slice(0, MAX_HISTORY_ITEMS)
}

export function removeHistoryEntry(entries: SavedQrEntry[], id: string): SavedQrEntry[] {
  return entries.filter((e) => e.id !== id)
}

export function parseHistory(raw: string | null): SavedQrEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: SavedQrEntry[] = []
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.label === 'string' &&
        typeof item.type === 'string' &&
        VALID_TYPES.has(item.type) &&
        item.typeData &&
        typeof item.typeData === 'object' &&
        item.style &&
        typeof item.style === 'object'
      ) {
        const type = item.type as QrType
        valid.push({
          id: item.id,
          label: item.label,
          type,
          typeData: { ...DEFAULT_DATA[type], ...item.typeData },
          style: { ...DEFAULT_STYLE, ...item.style },
          caption: typeof item.caption === 'string' ? item.caption : '',
          subcaption: typeof item.subcaption === 'string' ? item.subcaption : '',
          savedAt: typeof item.savedAt === 'number' ? item.savedAt : 0,
        })
      }
    }
    return valid.slice(0, MAX_HISTORY_ITEMS)
  } catch {
    return []
  }
}

export function loadHistory(): SavedQrEntry[] {
  try {
    return parseHistory(window.localStorage.getItem(HISTORY_KEY))
  } catch {
    return []
  }
}

export function saveHistory(entries: SavedQrEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function loadDraft(): DraftState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !VALID_TYPES.has(parsed.type)) return null
    const type = parsed.type as QrType
    const mergedData: DataByType = { ...DEFAULT_DATA }
    if (parsed.data && typeof parsed.data === 'object') {
      for (const t of VALID_TYPES) {
        const k = t as QrType
        if (parsed.data[k] && typeof parsed.data[k] === 'object') {
          mergedData[k] = { ...DEFAULT_DATA[k], ...parsed.data[k] }
        }
      }
    }
    return {
      type,
      data: mergedData,
      style: { ...DEFAULT_STYLE, ...(parsed.style && typeof parsed.style === 'object' ? parsed.style : {}) },
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      subcaption: typeof parsed.subcaption === 'string' ? parsed.subcaption : '',
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: DraftState): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Ignore storage quota or private-mode errors
  }
}
