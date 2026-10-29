# Quadra: a free QR code generator that runs in the browser

Make QR codes for links, text, WiFi, contacts, email, phone, SMS, WhatsApp, map locations, calendar events, SEPA/PayPal/UPI payments, crypto wallets, social profiles, app store downloads, and video meetings.
Style them (colors, gradients, dot and corner shapes, logo, custom titles and CTA frames), copy them directly to clipboard, print clean sheets, or generate batch codes in bulk from CSV to ZIP.

Everything runs in the visitor's browser. There is no backend and no database, so it can be hosted for free as static files
and it never sleeps. The codes are static: they hold the content directly, so they never expire.

## Run it on your computer

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # opens http://localhost:5173
npm test         # unit tests for the QR content and the scan checks
npm run build    # type-checks, then writes the site to dist/
```

## Deploy to Cloudflare Pages (free)

Option A, from GitHub (updates on every push):

1. Push this folder to a GitHub repository.
2. In the Cloudflare dashboard open Workers & Pages, create a Pages project, and connect the repository.
3. Build command: `npm run build`. Build output directory: `dist`. Node version is pinned to 22 by `.node-version`.
4. Save and deploy. You get a `*.pages.dev` address. You can add your own domain later in the project settings.

Option B, direct upload from your computer:

```bash
npm run build
npx wrangler pages deploy dist --project-name quadra
```

`public/_headers` adds basic security headers and long caching for the built files.

## Where things are

| Path | What it does |
| --- | --- |
| `src/lib/payload.ts` | Builds the exact text for each QR type (WiFi, vCard, event and so on) |
| `src/lib/style.ts` | Style settings, presets, and the options passed to the QR library |
| `src/lib/scanSafety.ts` | Contrast, logo size and border checks that warn before a code fails to scan |
| `src/hooks/useQrCode.ts` | Draws the preview and exports PNG and SVG with `qr-code-styling` |
| `src/components/` | The form, the style panel and the preview sheet |

To rename the product, change "Quadra" in `index.html` and in the header in `src/App.tsx`.

To add a QR type: add its data shape, default and builder in `payload.ts` (and a test), then add its form fields in
`ContentForm.tsx`.

## Before you print a code

- Scan it with at least two phones (iPhone camera and an Android phone) from the distance people will use.
- Dark code on a light background is the safest. The app warns when contrast is low, the logo is large or the border is small.
- Arabic and other non-Latin text: test a sample code on a real phone before relying on it.
- Keep the SVG for print. It stays sharp at any size.

## Author

Created and maintained by **Houssem Eddine Saifi** ([@Houssemcode](https://github.com/Houssemcode)).

