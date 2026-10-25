/**
 * Small badges for the Payment Icons block (keys match PAYMENT_ICONS in
 * class-sb-constants.php). Simple drawn marks on a 48×30 card: a name in the
 * payment's colour, not the companies' logo artwork.
 * Each: { label, svg } where svg is the inner markup; `currentColor` in the one-colour look.
 */
const text = (t, color, size = 11, weight = 800, extra = '') =>
  `<text x="24" y="19.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${t}</text>`

export const PAYMENT_ICONS = {
  visa: { label: 'Visa', svg: (c) => text('VISA', c || '#1A1F71', 12, 900, 'font-style="italic" letter-spacing="0.5"') },
  mastercard: {
    label: 'Mastercard',
    svg: (c) => c
      ? `<circle cx="20" cy="15" r="8" fill="none" stroke="${c}" stroke-width="2"/><circle cx="28" cy="15" r="8" fill="none" stroke="${c}" stroke-width="2"/>`
      : '<circle cx="20" cy="15" r="8" fill="#EB001B"/><circle cx="28" cy="15" r="8" fill="#F79E1B" fill-opacity=".9"/><path d="M24 8.1a8 8 0 0 1 0 13.8a8 8 0 0 1 0-13.8z" fill="#FF5F00"/>',
  },
  amex: { label: 'American Express', svg: (c) => (c ? text('AMEX', c, 11) : `<rect x="5" y="7" width="38" height="16" rx="2" fill="#2E77BC"/>${text('AMEX', '#fff', 10.5)}`) },
  diners: { label: 'Diners', svg: (c) => `<circle cx="17" cy="15" r="7" fill="none" stroke="${c || '#0079BE'}" stroke-width="2"/>${text('Diners', c || '#0079BE', 8, 700, 'x="32"')}`.replace('x="24" y="19.5"', 'x="32" y="18"') },
  isracard: { label: 'Isracard', svg: (c) => text('ISRACARD', c || '#E30613', 7.5, 900) },
  bit: { label: 'Bit', svg: (c) => text('bit', c || '#00A7B5', 15, 900, 'font-style="italic"') },
  apple_pay: { label: 'Apple Pay', svg: (c) => text('Apple Pay', c || '#000', 8.5, 700) },
  google_pay: { label: 'Google Pay', svg: (c) => text('G Pay', c || '#3C4043', 10.5, 700) },
  paypal: { label: 'PayPal', svg: (c) => text('PayPal', c || '#003087', 10, 900, 'font-style="italic"') },
}
