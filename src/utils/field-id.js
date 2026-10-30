import { useId } from 'vue'

/**
 * Quasar's fields (q-input, q-select, q-field) make up a random id in the browser when they
 * hydrate after the app has mounted, and every Store builder block loads that way: the server's
 * page had no id, the browser's did (a hydration mismatch). Vue's useId() is the same on both
 * sides, so give such fields `:for="fid('name')"`.
 */
export function useFieldIds() {
  const base = useId()
  return (name) => `${base}-${name}`
}
