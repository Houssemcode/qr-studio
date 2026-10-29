import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DATA,
  buildPayload,
  byteLength,
  escapeText,
  escapeWifi,
  fitsInQr,
  isValidUrl,
  normalizeUrl,
} from './payload.ts'

const d = structuredClone(DEFAULT_DATA)

describe('url', () => {
  it('asks for input when empty', () => {
    const r = buildPayload('url', { url: '' })
    assert.equal(r.value, '')
    assert.ok(r.problem)
  })
  it('adds https:// to bare domains', () => {
    assert.equal(buildPayload('url', { url: ' example.com/a?b=1 ' }).value, 'https://example.com/a?b=1')
  })
  it('keeps existing schemes', () => {
    assert.equal(buildPayload('url', { url: 'http://example.com' }).value, 'http://example.com')
  })
  it('rejects text that is not an address', () => {
    assert.ok(buildPayload('url', { url: 'hello world' }).problem)
    assert.ok(buildPayload('url', { url: 'nodots' }).problem)
  })
  it('allows localhost', () => {
    assert.equal(isValidUrl('localhost:3000'), true)
    assert.equal(normalizeUrl('localhost:3000'), 'https://localhost:3000')
  })
})

describe('text', () => {
  it('passes text through untouched', () => {
    assert.equal(buildPayload('text', { text: 'Hello,\nworld; ok' }).value, 'Hello,\nworld; ok')
  })
  it('blocks blank text', () => {
    assert.ok(buildPayload('text', { text: '   ' }).problem)
  })
})

describe('email', () => {
  it('builds a plain mailto', () => {
    assert.equal(buildPayload('email', { ...d.email, to: 'a@b.co' }).value, 'mailto:a@b.co')
  })
  it('encodes subject and body with %20, not +', () => {
    const r = buildPayload('email', { to: 'a@b.co', subject: 'Hi there', body: 'Line 1\nLine & 2' })
    assert.equal(r.value, 'mailto:a@b.co?subject=Hi%20there&body=Line%201%0ALine%20%26%202')
  })
  it('rejects bad addresses', () => {
    assert.ok(buildPayload('email', { ...d.email, to: 'nope' }).problem)
  })
})

describe('phone, sms, whatsapp', () => {
  it('cleans phone numbers but keeps the leading plus', () => {
    assert.equal(buildPayload('phone', { number: '+213 (555) 12-34-56' }).value, 'tel:+213555123456')
    assert.equal(buildPayload('phone', { number: '0555 12 34 56' }).value, 'tel:0555123456')
  })
  it('builds sms with an encoded body', () => {
    assert.equal(buildPayload('sms', { number: '+213555123456', message: 'On my way!' }).value, 'sms:+213555123456?body=On%20my%20way!')
    assert.equal(buildPayload('sms', { number: '555', message: '' }).value, 'sms:555')
  })
  it('builds whatsapp links with digits only', () => {
    assert.equal(buildPayload('whatsapp', { number: '+213 555 12 34 56', message: '' }).value, 'https://wa.me/213555123456')
    assert.equal(
      buildPayload('whatsapp', { number: '+213555123456', message: 'Salam & hi' }).value,
      'https://wa.me/213555123456?text=Salam%20%26%20hi',
    )
  })
  it('rejects numbers that are too short or too long', () => {
    assert.ok(buildPayload('phone', { number: '12' }).problem)
    assert.ok(buildPayload('whatsapp', { number: '12345', message: '' }).problem)
    assert.ok(buildPayload('whatsapp', { number: '1234567890123456', message: '' }).problem)
  })
})

describe('wifi', () => {
  it('builds a WPA network', () => {
    assert.equal(buildPayload('wifi', { ssid: 'Home', password: 'secret12', security: 'WPA', hidden: false }).value, 'WIFI:T:WPA;S:Home;P:secret12;;')
  })
  it('escapes special characters', () => {
    assert.equal(escapeWifi('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f')
    assert.equal(
      buildPayload('wifi', { ssid: 'My;Net', password: 'p:w,d', security: 'WPA', hidden: false }).value,
      'WIFI:T:WPA;S:My\\;Net;P:p\\:w\\,d;;',
    )
  })
  it('omits the password for open networks and marks hidden ones', () => {
    assert.equal(buildPayload('wifi', { ssid: 'Cafe', password: 'ignored', security: 'nopass', hidden: true }).value, 'WIFI:T:nopass;S:Cafe;H:true;;')
  })
  it('requires a password unless open', () => {
    assert.ok(buildPayload('wifi', { ssid: 'Home', password: '', security: 'WPA', hidden: false }).problem)
    assert.ok(buildPayload('wifi', { ssid: '', password: 'x', security: 'WPA', hidden: false }).problem)
  })
})

describe('vcard', () => {
  it('requires a name or company', () => {
    assert.ok(buildPayload('vcard', d.vcard).problem)
  })
  it('builds a full card', () => {
    const r = buildPayload('vcard', {
      ...d.vcard,
      firstName: 'Amina',
      lastName: 'Benali',
      organization: 'Acme, Inc.',
      jobTitle: 'Engineer',
      mobile: '+213 555 12 34 56',
      email: 'amina@example.com',
      website: 'example.com',
      city: 'Annaba',
      country: 'Algeria',
      note: 'Line one\nLine two',
    })
    assert.equal(
      r.value,
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Benali;Amina;;;',
        'FN:Amina Benali',
        'ORG:Acme\\, Inc.',
        'TITLE:Engineer',
        'TEL;TYPE=CELL:+213 555 12 34 56',
        'EMAIL;TYPE=INTERNET:amina@example.com',
        'URL:https://example.com',
        'ADR;TYPE=WORK:;;;Annaba;;;Algeria',
        'NOTE:Line one\\nLine two',
        'END:VCARD',
      ].join('\n'),
    )
  })
  it('falls back to the company as the display name', () => {
    const r = buildPayload('vcard', { ...d.vcard, organization: 'Acme' })
    assert.match(r.value, /\nFN:Acme\n/)
  })
  it('escapes text values', () => {
    assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne')
  })
  it('rejects a bad email', () => {
    assert.ok(buildPayload('vcard', { ...d.vcard, firstName: 'A', email: 'bad' }).problem)
  })
})

describe('location', () => {
  it('builds a maps link by default', () => {
    assert.equal(
      buildPayload('location', { latitude: '36.9', longitude: '7,76', format: 'maps' }).value,
      'https://www.google.com/maps?q=36.9,7.76',
    )
  })
  it('builds a geo link', () => {
    assert.equal(buildPayload('location', { latitude: '-33.86', longitude: '151.21', format: 'geo' }).value, 'geo:-33.86,151.21')
  })
  it('validates ranges and numbers', () => {
    assert.ok(buildPayload('location', { latitude: '91', longitude: '0', format: 'geo' }).problem)
    assert.ok(buildPayload('location', { latitude: '0', longitude: '181', format: 'geo' }).problem)
    assert.ok(buildPayload('location', { latitude: 'abc', longitude: '0', format: 'geo' }).problem)
    assert.ok(buildPayload('location', { latitude: '', longitude: '', format: 'geo' }).problem)
  })
})

describe('event', () => {
  it('builds a timed event with a default one-hour length', () => {
    const r = buildPayload('event', { ...d.event, title: 'Defense', start: '2026-11-05T23:30', location: 'Room 4' })
    assert.equal(
      r.value,
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'SUMMARY:Defense',
        'DTSTART:20261105T233000',
        'DTEND:20261106T003000',
        'LOCATION:Room 4',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n'),
    )
  })
  it('uses the given end time', () => {
    const r = buildPayload('event', { ...d.event, title: 'Talk', start: '2026-11-05T09:00', end: '2026-11-05T10:15' })
    assert.match(r.value, /DTEND:20261105T101500/)
  })
  it('builds an all-day event with an exclusive end date', () => {
    const r = buildPayload('event', { ...d.event, title: 'Holiday', allDay: true, start: '2026-12-31', end: '2026-12-31' })
    assert.match(r.value, /DTSTART;VALUE=DATE:20261231/)
    assert.match(r.value, /DTEND;VALUE=DATE:20270101/)
  })
  it('accepts a datetime string when switched to all-day', () => {
    const r = buildPayload('event', { ...d.event, title: 'Trip', allDay: true, start: '2026-03-01T08:00' })
    assert.match(r.value, /DTSTART;VALUE=DATE:20260301/)
    assert.match(r.value, /DTEND;VALUE=DATE:20260302/)
  })
  it('rejects an end before the start', () => {
    assert.ok(buildPayload('event', { ...d.event, title: 'X', start: '2026-11-05T10:00', end: '2026-11-05T09:00' }).problem)
  })
  it('requires a title and a start', () => {
    assert.ok(buildPayload('event', { ...d.event, start: '2026-11-05T10:00' }).problem)
    assert.ok(buildPayload('event', { ...d.event, title: 'X' }).problem)
  })
})

describe('crypto', () => {
  it('builds a BIP-21 / EIP-681 URI with optional amount, label and message', () => {
    const r = buildPayload('crypto', {
      currency: 'bitcoin',
      address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      amount: '0.025',
      label: 'Coffee Shop',
      message: 'Order 42',
    })
    assert.equal(
      r.value,
      'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.025&label=Coffee%20Shop&message=Order%2042',
    )
  })
  it('validates wallet address and amount', () => {
    assert.ok(buildPayload('crypto', { ...d.crypto, address: 'short' }).problem)
    assert.ok(
      buildPayload('crypto', {
        ...d.crypto,
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        amount: '-5',
      }).problem,
    )
  })
})

describe('payment', () => {
  it('builds a European EPC / SEPA QR payload', () => {
    const r = buildPayload('payment', {
      ...d.payment,
      method: 'sepa',
      recipientName: 'Cafe Atlas',
      iban: 'FR76 3000 6000 0112 3456 7890 189',
      bic: 'AGRIFRPP',
      amount: '18.5',
      reference: 'Table 4',
    })
    assert.equal(
      r.value,
      ['BCD', '002', '1', 'SCT', 'AGRIFRPP', 'Cafe Atlas', 'FR7630006000011234567890189', 'EUR18.50', '', '', 'Table 4'].join('\n'),
    )
  })
  it('builds PayPal.me and UPI links', () => {
    const pp = buildPayload('payment', {
      ...d.payment,
      method: 'paypal',
      paypalUser: '@nadia',
      amount: '20',
      currency: 'USD',
    })
    assert.equal(pp.value, 'https://www.paypal.com/paypalme/nadia/20USD')

    const upi = buildPayload('payment', {
      ...d.payment,
      method: 'upi',
      upiId: 'shop@okaxis',
      recipientName: 'Bakehouse',
      amount: '150',
      reference: 'Bread',
    })
    assert.equal(upi.value, 'upi://pay?pa=shop%40okaxis&pn=Bakehouse&am=150.00&cu=INR&tn=Bread')
  })
})

describe('social, appstore and meeting', () => {
  it('builds social profile links from handles or full URLs', () => {
    assert.equal(
      buildPayload('social', { platform: 'instagram', handle: '@quadra_app' }).value,
      'https://www.instagram.com/quadra_app',
    )
    assert.equal(
      buildPayload('social', { platform: 'tiktok', handle: 'quadra' }).value,
      'https://www.tiktok.com/@quadra',
    )
  })

  it('builds Apple App Store and Google Play links from IDs', () => {
    assert.equal(
      buildPayload('appstore', { platform: 'apple', appIdOrUrl: 'id389801252' }).value,
      'https://apps.apple.com/app/id389801252',
    )
    assert.equal(
      buildPayload('appstore', { platform: 'google', appIdOrUrl: 'org.mozilla.firefox' }).value,
      'https://play.google.com/store/apps/details?id=org.mozilla.firefox',
    )
  })

  it('builds Zoom and Google Meet links', () => {
    assert.equal(
      buildPayload('meeting', { platform: 'zoom', idOrUrl: '812 3456 7890', passcode: 'abc' }).value,
      'https://zoom.us/j/81234567890?pwd=abc',
    )
    assert.equal(
      buildPayload('meeting', { platform: 'meet', idOrUrl: 'abc-defg-hij', passcode: '' }).value,
      'https://meet.google.com/abc-defg-hij',
    )
  })
})

describe('capacity', () => {
  it('counts UTF-8 bytes, not characters', () => {
    assert.equal(byteLength('abc'), 3)
    assert.equal(byteLength('مرحبا'), 10)
  })
  it('knows when text is too long', () => {
    assert.equal(fitsInQr('a'.repeat(1273), 'H'), true)
    assert.equal(fitsInQr('a'.repeat(1274), 'H'), false)
    assert.equal(fitsInQr('a'.repeat(2953), 'L'), true)
    assert.equal(fitsInQr('a'.repeat(2954), 'L'), false)
  })
})
