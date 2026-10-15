/**
 * SVG icons used by Shop Builder blocks. Imported individually so only these
 * end up in the bundle (the app has no icon font).
 *
 * The keys MUST match the plugin's icon lists in class-sb-constants.php:
 *   GENERAL_ICONS   -> generalIcons   (Icon List block)
 *   SOCIAL_NETWORKS -> socialNetworks (Social Links block)
 *   CART_ICONS / WISHLIST_ICONS / MENU_ICONS -> cartIcons / wishlistIcons / menuIcons
 */
import {
  matCheck, matCheckCircle, matStar, matFavorite, matLocalShipping, matVerified, matLock,
  matSupportAgent, matPhone, matEmail, matLocationOn, matSchedule, matBolt, matSpa, matRecycling,
  matCardGiftcard, matLoyalty, matSell, matPayments, matCreditCard, matAutorenew, matThumbUp,
  matEmojiEvents, matInventory, matShoppingBag, matInfo, matHelp, matArrowForward, matPublic,
  matLanguage, matShoppingCart, matShoppingBasket, matLocalMall, matFavoriteBorder,
  matBookmarkBorder, matStarBorder, matMenu, matMenuOpen, matSegment, matMoreVert, matApps,
} from '@quasar/extras/material-icons'
import { outlinedShoppingCart, outlinedShoppingBag } from '@quasar/extras/material-icons-outlined'
import {
  fabFacebookF, fabInstagram, fabTiktok, fabXTwitter, fabYoutube, fabLinkedinIn, fabPinterestP,
  fabThreads, fabSnapchat, fabWhatsapp, fabTelegram,
} from '@quasar/extras/fontawesome-v6'

export const generalIcons = {
  check: matCheck,
  check_circle: matCheckCircle,
  star: matStar,
  favorite: matFavorite,
  shipping: matLocalShipping,
  verified: matVerified,
  lock: matLock,
  support: matSupportAgent,
  phone: matPhone,
  email: matEmail,
  location: matLocationOn,
  schedule: matSchedule,
  bolt: matBolt,
  spa: matSpa,
  recycling: matRecycling,
  gift: matCardGiftcard,
  loyalty: matLoyalty,
  sell: matSell,
  payments: matPayments,
  card: matCreditCard,
  returns: matAutorenew,
  thumb_up: matThumbUp,
  award: matEmojiEvents,
  inventory: matInventory,
  bag: matShoppingBag,
  info: matInfo,
  help: matHelp,
  arrow: matArrowForward,
  globe: matPublic,
}

/**
 * The header widgets' button icons (CART_ICONS, WISHLIST_ICONS, MENU_ICONS
 * in class-sb-constants.php). "custom" is the owner's own image.
 */
export const cartIcons = {
  cart: matShoppingCart,
  cart_outline: outlinedShoppingCart,
  bag: matShoppingBag,
  bag_outline: outlinedShoppingBag,
  basket: matShoppingBasket,
  tote: matLocalMall,
}
export const wishlistIcons = {
  heart_outline: matFavoriteBorder,
  heart: matFavorite,
  bookmark: matBookmarkBorder,
  star: matStarBorder,
}
export const menuIcons = {
  menu: matMenu,
  menu_open: matMenuOpen,
  short: matSegment,
  dots: matMoreVert,
  grid: matApps,
}

/** icon + official brand color + how to turn the admin's value into a link. */
export const socialNetworks = {
  facebook: { label: 'Facebook', icon: fabFacebookF, color: '#1877F2' },
  instagram: { label: 'Instagram', icon: fabInstagram, color: '#E4405F' },
  tiktok: { label: 'TikTok', icon: fabTiktok, color: '#000000' },
  x: { label: 'X', icon: fabXTwitter, color: '#000000' },
  youtube: { label: 'YouTube', icon: fabYoutube, color: '#FF0000' },
  linkedin: { label: 'LinkedIn', icon: fabLinkedinIn, color: '#0A66C2' },
  pinterest: { label: 'Pinterest', icon: fabPinterestP, color: '#BD081C' },
  threads: { label: 'Threads', icon: fabThreads, color: '#000000' },
  snapchat: { label: 'Snapchat', icon: fabSnapchat, color: '#FFFC00', fg: '#000000' },
  whatsapp: { label: 'WhatsApp', icon: fabWhatsapp, color: '#25D366', type: 'whatsapp' },
  telegram: { label: 'Telegram', icon: fabTelegram, color: '#26A5E4', type: 'telegram' },
  email: { label: 'Email', icon: matEmail, color: '#6B7280', type: 'email' },
  phone: { label: 'Phone', icon: matPhone, color: '#16A34A', type: 'phone' },
  website: { label: 'Website', icon: matLanguage, color: '#4B5563' },
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

/** Builds a safe href for a Social Links item, or '' if the value is unusable. */
export function socialHref(network, value) {
  const v = String(value || '').trim()
  if (!v) return ''
  const type = socialNetworks[network]?.type

  if (type === 'email' && !/^mailto:/i.test(v)) return /^[^\s@]+@[^\s@]+$/.test(v) ? `mailto:${v}` : ''
  if (type === 'phone' && !/^tel:/i.test(v)) return `tel:${v.replace(/[^\d+]/g, '')}`
  if (type === 'whatsapp' && !/^https?:/i.test(v)) return `https://wa.me/${v.replace(/\D/g, '')}`
  if (type === 'telegram' && !/^https?:/i.test(v)) return `https://t.me/${v.replace(/^@/, '')}`

  if (SAFE_URL.test(v)) return v
  // Bare domains ("instagram.com/shop") get https://.
  return /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v) ? `https://${v}` : ''
}
