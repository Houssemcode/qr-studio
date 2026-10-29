/**
 * Built-in center logos for common QR code uses and platforms.
 * Each icon is an inline SVG data URL with explicit pixel dimensions so it
 * draws cleanly into both HTML canvas (PNG export) and SVG export.
 */

export interface BuiltinIcon {
  id: string
  label: string
  dataUrl: string
}

function badgeSvg(bg: string, inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="${bg}" stroke="#ffffff" stroke-width="4"/>${inner}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const BUILTIN_ICONS: BuiltinIcon[] = [
  {
    id: 'wifi',
    label: 'Wi-Fi',
    dataUrl: badgeSvg(
      '#0284c7',
      '<path d="M14 26a26 26 0 0 1 36 0M20 33a18 18 0 0 1 24 0M26 40a10 10 0 0 1 12 0" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cx="32" cy="46.5" r="3.2" fill="#fff"/>',
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    dataUrl: badgeSvg(
      '#16a34a',
      '<path d="M32 14a17.5 17.5 0 0 0-15.1 26.3L15 49l9-2a17.5 17.5 0 1 0 8-33Z" fill="none" stroke="#fff" stroke-width="3.8" stroke-linejoin="round"/><path d="M25.5 24.5c-.5-1-1-1-1.5-1s-1.2.2-1.8.9a6 6 0 0 0-1.7 4.2c0 2.5 1.8 4.8 2 5.1.3.4 3.5 5.5 8.6 7.5 4.2 1.7 5.1 1.4 6 1.3 1-.1 3-1.2 3.4-2.4.4-1.2.4-2.2.3-2.4-.2-.2-.6-.4-1.3-.7l-3.1-1.5c-.4-.2-.7-.3-1 .2-.3.4-1.2 1.5-1.5 1.8-.3.3-.6.3-1 .1-1.9-.9-3.3-1.8-4.7-4-.3-.5.3-.8.9-1.9.1-.3 0-.6-.1-.8l-1.5-3.4Z" fill="#fff"/>',
    ),
  },
  {
    id: 'web',
    label: 'Website',
    dataUrl: badgeSvg(
      '#14172b',
      '<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="3.6"/><ellipse cx="32" cy="32" rx="8" ry="17" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M16 26h32M16 38h32" stroke="#fff" stroke-width="3.2"/>',
    ),
  },
  {
    id: 'location',
    label: 'Map pin',
    dataUrl: badgeSvg(
      '#dc2626',
      '<path d="M32 14c-7.7 0-14 6-14 13.5C18 37.8 32 50 32 50s14-12.2 14-22.5C46 20 39.7 14 32 14Zm0 18.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="#fff"/>',
    ),
  },
  {
    id: 'contact',
    label: 'Contact',
    dataUrl: badgeSvg(
      '#3b33f5',
      '<circle cx="32" cy="24.5" r="6.5" fill="#fff"/><path d="M19 46c0-6.6 5.8-11.5 13-11.5S45 39.4 45 46" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>',
    ),
  },
  {
    id: 'email',
    label: 'Email',
    dataUrl: badgeSvg(
      '#2563eb',
      '<rect x="14" y="20" width="36" height="24" rx="3.5" fill="none" stroke="#fff" stroke-width="3.6"/><path d="m16 22 16 12 16-12" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
  },
  {
    id: 'phone',
    label: 'Phone',
    dataUrl: badgeSvg(
      '#0d9488',
      '<path d="M22 17h5l3 8-3.5 2.5a21 21 0 0 0 10 10L39 34l8 3v5a4 4 0 0 1-4 4C28.6 46 18 35.4 18 21a4 4 0 0 1 4-4Z" fill="#fff"/>',
    ),
  },
  {
    id: 'calendar',
    label: 'Event',
    dataUrl: badgeSvg(
      '#7c3aed',
      '<rect x="16" y="18" width="32" height="30" rx="4" fill="none" stroke="#fff" stroke-width="3.6"/><path d="M16 27h32M24 14v7M40 14v7" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><rect x="23" y="33" width="6" height="6" rx="1" fill="#fff"/>',
    ),
  },
  {
    id: 'menu',
    label: 'Menu',
    dataUrl: badgeSvg(
      '#ea580c',
      '<path d="M23 16v12a4 4 0 0 0 4 4v16M19 16v9M27 16v9M41 16c-3.5 0-6 4-6 10v6h6v16" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    dataUrl: badgeSvg(
      '#e1306c',
      '<rect x="16" y="16" width="32" height="32" rx="8" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="32" cy="32" r="7" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="40.5" cy="23.5" r="2.2" fill="#fff"/>',
    ),
  },
  {
    id: 'x',
    label: 'X',
    dataUrl: badgeSvg(
      '#0f1419',
      '<path d="M18 17h7.2l8.5 11.4L42.8 17H47L35.6 30.2 48 47h-7.2l-9.1-12.2L21.3 47H17l12-13.9L18 17Z" fill="#fff"/>',
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    dataUrl: badgeSvg(
      '#0a66c2',
      '<circle cx="22" cy="22" r="3.2" fill="#fff"/><path d="M19.2 28h5.6v18h-5.6V28Zm10 0h5.3v2.5h.1c.8-1.4 2.6-2.9 5.4-2.9 5.7 0 6.8 3.6 6.8 8.4V46h-5.6v-8.8c0-2.1 0-4.8-3-4.8s-3.4 2.3-3.4 4.6V46h-5.6V28Z" fill="#fff"/>',
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    dataUrl: badgeSvg(
      '#dc2626',
      '<rect x="14" y="20" width="36" height="24" rx="6" fill="none" stroke="#fff" stroke-width="3.6"/><path d="m28 26 11 6-11 6V26Z" fill="#fff"/>',
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    dataUrl: badgeSvg(
      '#1f2328',
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M32 14a18 18 0 0 0-5.7 35.1c.9.2 1.2-.4 1.2-.9v-3.2c-5 1.1-6.1-2.1-6.1-2.1-.8-2-2-2.6-2-2.6-1.6-1.1.1-1.1.1-1.1 1.8.1 2.8 1.9 2.8 1.9 1.6 2.7 4.2 1.9 5.3 1.5.2-1.2.6-1.9 1.1-2.4-4-.5-8.2-2-8.2-8.9 0-2 .7-3.6 1.9-4.8-.2-.5-.8-2.3.2-4.8 0 0 1.5-.5 5 1.8a17.2 17.2 0 0 1 9 0c3.4-2.3 4.9-1.8 4.9-1.8 1 2.5.4 4.3.2 4.8 1.2 1.2 1.9 2.8 1.9 4.8 0 6.9-4.2 8.4-8.2 8.9.6.6 1.2 1.7 1.2 3.4v5c0 .5.3 1.1 1.2.9A18 18 0 0 0 32 14Z" fill="#fff"/>',
    ),
  },
  {
    id: 'payment',
    label: 'Payment',
    dataUrl: badgeSvg(
      '#059669',
      '<rect x="14" y="20" width="36" height="24" rx="3.5" fill="none" stroke="#fff" stroke-width="3.6"/><path d="M14 28h36M20 37h9" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>',
    ),
  },
  {
    id: 'bitcoin',
    label: 'Bitcoin',
    dataUrl: badgeSvg(
      '#f7931a',
      '<path d="M25 18h10a5.5 5.5 0 0 1 0 11H25V18Zm0 11h11.5a6 6 0 0 1 0 12H25V29Zm4-15v4m6-4v4m-6 28v4m6-4v4" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    dataUrl: badgeSvg(
      '#229ed9',
      '<path d="M46 18 15 30.5l9.5 3.6L39 23.5l-11 13.2.5 8.3 5.2-5 6.8 5L46 18Z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>',
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    dataUrl: badgeSvg(
      '#111111',
      '<path d="M36 16v21a7.5 7.5 0 1 1-6.5-7.4V25a12 12 0 1 0 11.5 12V25.5c2.2 1.6 4.8 2.5 7.5 2.5v-4.5c-4.2 0-7.5-3.3-7.5-7.5H36Z" fill="#fff"/>',
    ),
  },
]
