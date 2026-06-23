import { inject, computed } from 'vue'
import es from '../locales/es.js'
import en from '../locales/en.js'

const LOCALES = { es, en }

export function useSpLabels() {
  const locale = inject('spLocale', 'es')
  const labels = computed(() => LOCALES[locale.value] || LOCALES.es)
  return new Proxy({}, {
    get(target, key) {
      return labels.value[key]
    },
  })
}
