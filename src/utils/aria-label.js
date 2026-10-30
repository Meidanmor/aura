import { computed } from 'vue'
import { useLoopItem, plainText } from 'src/components/loops/loop-item.js'

/**
 * Screen Reader Label (Advanced → Accessibility, or a list item's own field): what screen readers
 * say for a link or button. `{name}` becomes the name of the card's item inside a Loop Template.
 * A block in a card with no label of its own says its text plus the item's name, so a list of
 * "Shop now" buttons doesn't sound the same for every card.
 */
export function fillAriaLabel(label, itemName) {
  const text = String(label || '').trim()
  if (!text) return ''
  return text.replace(/\{name\}/g, itemName || '').replace(/\s+/g, ' ').trim()
}

/** A computed label: the owner's (with {name}), else "<text>: <item name>" in a card, else ''. */
export function useAriaLabel(getLabel, getText = () => '') {
  const loop = useLoopItem()
  return computed(() => {
    const name = plainText(loop?.value?.item?.name || '')
    const own = fillAriaLabel(getLabel(), name)
    if (own) return own
    const text = String(getText() || '').trim()
    return text && name ? `${text}: ${name}` : ''
  })
}
