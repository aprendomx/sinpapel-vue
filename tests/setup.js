import { config } from '@vue/test-utils'

const passthrough = (tag) => ({ name: tag, template: `<div><slot /></div>` })

config.global.stubs = {
  'q-icon': { name: 'q-icon', template: '<i />' },
  'q-dialog': passthrough('q-dialog'),
  'q-card': passthrough('q-card'),
  'q-card-section': passthrough('q-card-section'),
  'q-form': { name: 'q-form', template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>' },
  'q-space': passthrough('q-space'),
  'q-spinner': { name: 'q-spinner', template: '<span />' },
  'q-btn': { name: 'q-btn', template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'q-tabs': passthrough('q-tabs'),
  'q-tab': passthrough('q-tab'),
  'q-tab-panels': passthrough('q-tab-panels'),
  'q-tab-panel': passthrough('q-tab-panel'),
}
