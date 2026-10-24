// src/utils/formatters.js
import cart from 'src/stores/cart'
import { currentLocale } from 'src/i18n/index.js'

const escHtml = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * An amount in the store's smallest unit, written the way the store writes prices
 * (`prices` = a Store API product's prices: separators, prefix, suffix). No locale
 * formatting: the server and the browser must match. Returns escaped HTML, '' when
 * the amount isn't a number.
 */
export function formatStoreAmount(prices, minor) {
  const unit = Number(prices?.currency_minor_unit) || 0
  const n = Number(minor) / 10 ** unit
  if (minor === '' || minor == null || !Number.isFinite(n)) return ''
  const [whole, frac] = n.toFixed(unit).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, prices.currency_thousand_separator ?? ',')
  const num = frac ? `${grouped}${prices.currency_decimal_separator ?? '.'}${frac}` : grouped
  return escHtml(`${prices.currency_prefix ?? ''}${num}${prices.currency_suffix ?? ''}`)
}

export function formatCurrency(amountStr, {
  minorUnit,
  decimalSeparator,
  prefix,
  suffix
} = {}) {
  const totals = cart.state.cart_array?.totals

  const resolvedMinorUnit = minorUnit ?? totals?.currency_minor_unit ?? 2
  const resolvedDecimalSeparator = decimalSeparator ?? totals?.currency_decimal_separator ?? '.'
  const resolvedPrefix = prefix ?? totals?.currency_prefix ?? '$'
  const resolvedSuffix = suffix ?? totals?.currency_suffix ?? ''

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount)) {
    return `${resolvedPrefix}0${resolvedDecimalSeparator}${'0'.repeat(resolvedMinorUnit)}${resolvedSuffix}`;
  }

  const factor = Math.pow(10, resolvedMinorUnit);
  const number = amount / factor;
  // The store's language, the same on the server and in the browser.
  return `${resolvedPrefix}${number.toLocaleString(currentLocale(), {
    minimumFractionDigits: resolvedMinorUnit,
    maximumFractionDigits: resolvedMinorUnit
  })}${resolvedSuffix}`;
}