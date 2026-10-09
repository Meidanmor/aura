// src/utils/formatters.js
import cart from 'src/stores/cart'
import { currentLocale } from 'src/i18n/index.js'

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