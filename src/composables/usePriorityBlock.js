import { computed, inject } from 'vue'

/**
 * Whether this block holds the page's first image (picked by SectionRenderer,
 * see src/utils/priority-image.js): it should load first.
 */
export function usePriorityBlock(blockId) {
  const priority = inject('sbPriority', null)
  return computed(() => !!blockId && !!priority?.value?.blocks?.has(blockId))
}
