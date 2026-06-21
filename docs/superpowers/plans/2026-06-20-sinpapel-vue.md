# sinpapel-vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue 3 library (+ demo app) of reusable workflow-tracking widgets that consume the generic `sinpapel-drf` REST API.

**Architecture:** A single API client (`createSinpapelClient`, injected axios) is the only network seam. A pure `buildSignaturePayload` function + `useTransition` composable shape transition requests. A per-`(resource, pk)` Pinia store wraps the client. Seven scoped Vue SFCs render against the client/store; a composed `SeguimientoPanel` is the drop-in widget. A demo app mounts it against a configurable backend.

**Tech Stack:** Vue 3 (Composition API), Pinia, Quasar (peer dep), Vite (library mode), Vitest + @vue/test-utils, axios (peer/dev), rai-frontend-gates.

## Global Constraints

- Package name: `@aprendomx/sinpapel-vue`, version `0.1.0`, `"type": "module"`.
- `vue`, `pinia`, `quasar` are **peer dependencies** and externalized in the library build. Never bundle them.
- Source is **JavaScript** (`.js` + `.vue`), no TypeScript. JSDoc only where it aids clarity.
- The API client takes a **consumer-injected axios instance**. Never import a global axios boot file; never hardcode `baseURL` or auth.
- Default `basePath` is `/sinpapel/api` (where `sinpapel_drf.urls` is mounted).
- Widget styles are **scoped** and reference only `--sp-*` CSS variables from `src/styles/tokens.css`. No hardcoded brand hex (no guinda `#9b2247`, etc.).
- Endpoint contracts are fixed by `sinpapel-drf` (read from `/Users/jadrians/aprendo/sinpapel-drf/viewsets.py` + `serializers.py`). Do not invent fields.
- **Enforced quality gate:** `vitest run` must pass (wired via `rai-frontend gate check tests`). `lint` and `build` are scripts but not blocking gates.
- TDD: write the failing test first for every logic unit. Commit after each task.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `vite.config.js`, `vitest.config.js`, `eslint.config.js`, `jsconfig.json`, `index.html`, `.gitignore` | Scaffolding, build, dev, test, lint config. |
| `src/index.js` | Public entry — re-exports everything consumable. |
| `src/styles/tokens.css` | `--sp-*` neutral theme variables. |
| `src/client/sinpapelClient.js` | API client + `buildTransitionRequest` (encoding). |
| `src/composables/useTransition.js` | `useTransition` + pure `buildSignaturePayload`. |
| `src/stores/useSeguimientoStore.js` | Pinia setup-store factory per `(resource, pk)`. |
| `src/components/StateBadge.vue` | State pill; color precedence prop→api→token. |
| `src/components/HistoryTimeline.vue` | Timeline over `HistoryEntrySerializer` rows. |
| `src/components/TransitionDialog.vue` | Transition form + polymorphic signature section. |
| `src/components/PreviewTransitionPanel.vue` | Read-only preview/impact report. |
| `src/components/MetadatosForm.vue` | Schema-driven metadata form (GET/PATCH). |
| `src/components/SlaStatusPanel.vue` | SLA evaluation trigger + results. |
| `src/components/SeguimientoPanel.vue` | Composed orchestrator (badge + tabs + dialog). |
| `demo/main.js`, `demo/App.vue` | Runnable config-shell app. |
| `tests/setup.js` | Global Quasar component stubs for tests. |
| `tests/**/*.test.js` | Unit tests. |

---

### Task 1: Repo scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `eslint.config.js`, `jsconfig.json`, `index.html`, `.gitignore`
- Create: `src/index.js`, `src/styles/tokens.css`
- Create: `tests/setup.js`, `tests/smoke.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable/testable repo. `src/index.js` is the public entry (filled incrementally by later tasks).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@aprendomx/sinpapel-vue",
  "version": "0.1.0",
  "description": "Vue 3 workflow-tracking widgets for the sinpapel-drf API",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/sinpapel-vue.umd.cjs",
  "module": "./dist/sinpapel-vue.js",
  "exports": {
    ".": { "import": "./dist/sinpapel-vue.js", "require": "./dist/sinpapel-vue.umd.cjs" },
    "./style.css": "./dist/sinpapel-vue.css"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint \"{src,demo,tests}/**/*.{js,vue}\""
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "pinia": "^3.0.0",
    "quasar": "^2.16.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.14.0",
    "@vitejs/plugin-vue": "^5.2.0",
    "@vue/test-utils": "^2.4.6",
    "axios": "^1.7.0",
    "eslint": "^9.14.0",
    "eslint-plugin-vue": "^10.4.0",
    "globals": "^16.4.0",
    "jsdom": "^25.0.0",
    "pinia": "^3.0.1",
    "quasar": "^2.16.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "vue": "^3.5.22"
  }
}
```

- [ ] **Step 2: Write `vite.config.js`** (library build; dev serves the demo)

```js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'SinpapelVue',
      fileName: 'sinpapel-vue',
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'quasar'],
      output: { globals: { vue: 'Vue', pinia: 'Pinia', quasar: 'Quasar' } },
    },
  },
})
```

- [ ] **Step 3: Write `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
})
```

- [ ] **Step 4: Write `eslint.config.js`** (lean, library-oriented — no `@quasar/app-vite/eslint`)

```js
import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'vue/multi-word-component-names': 'off' },
  },
]
```

- [ ] **Step 5: Write `jsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ESNext",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*", "demo/**/*", "tests/**/*"]
}
```

- [ ] **Step 6: Write `index.html`** (demo entry at repo root)

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>sinpapel-vue · demo</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/demo/main.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `.gitignore`** (already present from spec commit; ensure these lines exist)

```
node_modules/
dist/
.DS_Store
*.local
coverage/
```

- [ ] **Step 8: Write `src/styles/tokens.css`**

```css
:root {
  --sp-color-primary: #3a4a5c;
  --sp-color-on-primary: #ffffff;
  --sp-surface: #ffffff;
  --sp-surface-alt: #f6f7f9;
  --sp-border: #dfe3e8;
  --sp-text: #1f2630;
  --sp-text-muted: #6b7682;
  --sp-radius: 8px;
  --sp-badge-bg: #eef1f4;
  --sp-badge-text: #3a4a5c;
  --sp-ok: #1e5b4f;
  --sp-warn: #b06a10;
  --sp-danger: #b00425;
  --sp-font: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 9: Write `src/index.js`** (entry; expands as tasks land)

```js
import './styles/tokens.css'

export { createSinpapelClient, buildTransitionRequest } from './client/sinpapelClient.js'
```

- [ ] **Step 10: Write `tests/setup.js`** (global Quasar stubs)

```js
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
```

- [ ] **Step 11: Write `tests/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest'
import * as lib from '../src/index.js'

describe('library entry', () => {
  it('exports the client factory', () => {
    expect(typeof lib.createSinpapelClient).toBe('function')
  })
})
```

- [ ] **Step 12: Install and run**

Run: `cd /Users/jadrians/aprendo/sinpapel-vue && npm install`
Expected: completes without peer-dep errors.

- [ ] **Step 13: Run smoke test (will fail — client not written yet)**

Run: `npm test`
Expected: FAIL — `src/client/sinpapelClient.js` does not exist (import error). This confirms wiring; Task 2 makes it green.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold sinpapel-vue library (vite lib mode + vitest + eslint)"
```

---

### Task 2: API client (`createSinpapelClient` + `buildTransitionRequest`)

**Files:**
- Create: `src/client/sinpapelClient.js`
- Test: `tests/client/sinpapelClient.test.js`

**Interfaces:**
- Consumes: an axios-like object with `get/post/patch(url, body?, config?)` returning `{ data }`.
- Produces:
  - `createSinpapelClient({ axios, basePath='/sinpapel/api', resource, pk=null }) → client`
  - `client.pk` (mutable), `client.availableTransitions() → Promise<Array>`, `client.history({page,pageSize}) → Promise<{count,results,...}>`, `client.previewTransition(targetState) → Promise<Object>`, `client.getMetadatos() → Promise<{schema,values}>`, `client.patchMetadatos(values) → Promise<Object>`, `client.slaStatus() → Promise<Array>`, `client.transition(payload) → Promise<Object>`
  - `buildTransitionRequest(payload) → { body, config }`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { createSinpapelClient, buildTransitionRequest } from '../../src/client/sinpapelClient.js'

function mockAxios() {
  return {
    get: vi.fn().mockResolvedValue({ data: 'GET_OK' }),
    post: vi.fn().mockResolvedValue({ data: 'POST_OK' }),
    patch: vi.fn().mockResolvedValue({ data: 'PATCH_OK' }),
  }
}

describe('createSinpapelClient', () => {
  it('requires axios and resource', () => {
    expect(() => createSinpapelClient({ resource: 'x' })).toThrow(/axios/)
    expect(() => createSinpapelClient({ axios: {} })).toThrow(/resource/)
  })

  it('builds available-transitions URL', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'solicitudes', pk: 42 })
    const r = await c.availableTransitions()
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/42/available-transitions/')
    expect(r).toBe('GET_OK')
  })

  it('passes pagination params to history', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'docs', pk: 7 })
    await c.history({ page: 3, pageSize: 50 })
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/docs/7/history/', { params: { page: 3, page_size: 50 } })
  })

  it('honors custom basePath and mutable pk', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, basePath: '/api/wf/', resource: 'r', pk: 1 })
    c.pk = 99
    await c.previewTransition('APROBADA')
    expect(axios.post).toHaveBeenCalledWith('/api/wf/r/99/preview-transition/', { target_state: 'APROBADA' })
  })

  it('patches metadatos with raw values', async () => {
    const axios = mockAxios()
    const c = createSinpapelClient({ axios, resource: 'r', pk: 1 })
    await c.patchMetadatos({ monto: 10 })
    expect(axios.patch).toHaveBeenCalledWith('/sinpapel/api/r/1/metadatos/', { monto: 10 })
  })

  it('sends unsigned transition as JSON', async () => {
    const { body, config } = buildTransitionRequest({ target_state: 'X', comentarios: 'hi' })
    expect(body).toEqual({ target_state: 'X', comentarios: 'hi' })
    expect(config).toEqual({})
  })

  it('sends fiel server-side transition as multipart', () => {
    const cer = new Blob(['cer']); const key = new Blob(['key'])
    const { body, config } = buildTransitionRequest({
      target_state: 'X',
      signature: { backend: 'fiel', mode: 'server-side', cer_file: cer, key_file: key, password: 'pw' },
    })
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('target_state')).toBe('X')
    expect(body.get('signature.password')).toBe('pw')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- sinpapelClient`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/client/sinpapelClient.js`**

```js
/**
 * Encodes a transition payload for POST .../transition/.
 * fiel+server-side → multipart (cer/key files); everything else → JSON.
 * Multipart nested keys use DRF's dotted `signature.<field>` convention;
 * verify wire-compatibility against a live backend (see demo).
 */
export function buildTransitionRequest(payload) {
  const sig = payload.signature
  const serverSideFiel = sig && sig.backend === 'fiel' && sig.mode === 'server-side'

  if (serverSideFiel) {
    const fd = new FormData()
    fd.append('target_state', payload.target_state)
    if (payload.comentarios) fd.append('comentarios', payload.comentarios)
    if (payload.monto_aprobado != null) fd.append('monto_aprobado', String(payload.monto_aprobado))
    if (payload.condiciones != null) fd.append('condiciones', payload.condiciones)
    fd.append('signature.backend', 'fiel')
    fd.append('signature.mode', 'server-side')
    fd.append('signature.cer_file', sig.cer_file)
    fd.append('signature.key_file', sig.key_file)
    fd.append('signature.password', sig.password)
    return { body: fd, config: { headers: { 'Content-Type': 'multipart/form-data' } } }
  }

  return { body: payload, config: {} }
}

export function createSinpapelClient({ axios, basePath = '/sinpapel/api', resource, pk = null } = {}) {
  if (!axios) throw new Error('createSinpapelClient: `axios` instance is required')
  if (!resource) throw new Error('createSinpapelClient: `resource` slug is required')

  const base = () => `${basePath.replace(/\/+$/, '')}/${client.resource}/${client.pk}`

  const client = {
    axios,
    resource,
    pk,
    async availableTransitions() {
      const { data } = await axios.get(`${base()}/available-transitions/`)
      return data
    },
    async history({ page = 1, pageSize } = {}) {
      const params = { page }
      if (pageSize) params.page_size = pageSize
      const { data } = await axios.get(`${base()}/history/`, { params })
      return data
    },
    async previewTransition(targetState) {
      const { data } = await axios.post(`${base()}/preview-transition/`, { target_state: targetState })
      return data
    },
    async getMetadatos() {
      const { data } = await axios.get(`${base()}/metadatos/`)
      return data
    },
    async patchMetadatos(values) {
      const { data } = await axios.patch(`${base()}/metadatos/`, values)
      return data
    },
    async slaStatus() {
      const { data } = await axios.post(`${base()}/sla-status/`)
      return data
    },
    async transition(payload) {
      const { body, config } = buildTransitionRequest(payload)
      const { data } = await axios.post(`${base()}/transition/`, body, config)
      return data
    },
  }
  return client
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- sinpapelClient`
Expected: PASS (all cases). Also `npm test` smoke test now passes.

- [ ] **Step 5: Commit**

```bash
git add src/client/sinpapelClient.js tests/client/sinpapelClient.test.js
git commit -m "feat: sinpapel-drf API client with transition encoding"
```

---

### Task 3: `useTransition` composable + `buildSignaturePayload`

**Files:**
- Create: `src/composables/useTransition.js`
- Test: `tests/composables/useTransition.test.js`
- Modify: `src/index.js` (add export)

**Interfaces:**
- Consumes: a `client` with `.transition(payload)` (Task 2).
- Produces:
  - `buildSignaturePayload(backend, mode, fields) → object | null`
  - `useTransition(client) → { targetState, comentarios, montoAprobado, condiciones, signatureBackend, signatureMode, signatureFields, signaturePayload, loading, error, buildPayload, submit }`
  - `buildPayload() → { target_state, comentarios?, monto_aprobado?, condiciones?, signature? }`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { buildSignaturePayload, useTransition } from '../../src/composables/useTransition.js'

describe('buildSignaturePayload', () => {
  it('returns null when no backend chosen', () => {
    expect(buildSignaturePayload(null, 'client-side', {})).toBeNull()
  })
  it('shapes fiel client-side', () => {
    const f = { firma_b64: 'F', certificado_cer_b64: 'C' }
    expect(buildSignaturePayload('fiel', 'client-side', f))
      .toEqual({ backend: 'fiel', mode: 'client-side', firma_b64: 'F', certificado_cer_b64: 'C' })
  })
  it('shapes fiel server-side', () => {
    const f = { cer_file: 'cer', key_file: 'key', password: 'pw' }
    expect(buildSignaturePayload('fiel', 'server-side', f))
      .toEqual({ backend: 'fiel', mode: 'server-side', cer_file: 'cer', key_file: 'key', password: 'pw' })
  })
  it('shapes manual', () => {
    const f = { scanned_image_path: '/s.png', witness_name: 'Ana' }
    expect(buildSignaturePayload('manual', 'client-side', f))
      .toEqual({ backend: 'manual', scanned_image_path: '/s.png', witness_name: 'Ana' })
  })
  it('shapes fake', () => {
    expect(buildSignaturePayload('fake', 'client-side', {})).toEqual({ backend: 'fake' })
  })
})

describe('useTransition', () => {
  it('builds an unsigned payload, omitting empty optionals', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'APROBADA'
    expect(t.buildPayload()).toEqual({ target_state: 'APROBADA' })
  })
  it('includes optionals and signature when set', () => {
    const t = useTransition({ transition: vi.fn() })
    t.targetState.value = 'APROBADA'
    t.comentarios.value = 'ok'
    t.montoAprobado.value = 1000
    t.signatureBackend.value = 'fake'
    expect(t.buildPayload()).toEqual({
      target_state: 'APROBADA', comentarios: 'ok', monto_aprobado: 1000, signature: { backend: 'fake' },
    })
  })
  it('submit calls client.transition and captures error body', async () => {
    const client = { transition: vi.fn().mockRejectedValue({ response: { data: { detail: 'nope' } } }) }
    const t = useTransition(client)
    t.targetState.value = 'X'
    await expect(t.submit()).rejects.toBeTruthy()
    expect(t.error.value).toEqual({ detail: 'nope' })
    expect(t.loading.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- useTransition`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/composables/useTransition.js`**

```js
import { ref, reactive, computed } from 'vue'

/** Pure: shape the `signature` block per backend×mode (mirrors SignatureRequestSerializer). */
export function buildSignaturePayload(backend, mode, f) {
  if (!backend) return null
  if (backend === 'fiel' && mode === 'server-side') {
    return { backend: 'fiel', mode: 'server-side', cer_file: f.cer_file, key_file: f.key_file, password: f.password }
  }
  if (backend === 'fiel') {
    return { backend: 'fiel', mode: 'client-side', firma_b64: f.firma_b64, certificado_cer_b64: f.certificado_cer_b64 }
  }
  if (backend === 'manual') {
    return { backend: 'manual', scanned_image_path: f.scanned_image_path, witness_name: f.witness_name }
  }
  if (backend === 'fake') return { backend: 'fake' }
  return null
}

export function useTransition(client) {
  const targetState = ref(null)
  const comentarios = ref('')
  const montoAprobado = ref(null)
  const condiciones = ref('')
  const signatureBackend = ref(null) // null | 'fiel' | 'manual' | 'fake'
  const signatureMode = ref('client-side')
  const signatureFields = reactive({
    firma_b64: '', certificado_cer_b64: '',
    cer_file: null, key_file: null, password: '',
    scanned_image_path: '', witness_name: '',
  })
  const loading = ref(false)
  const error = ref(null)

  const signaturePayload = computed(() =>
    buildSignaturePayload(signatureBackend.value, signatureMode.value, signatureFields),
  )

  function buildPayload() {
    const payload = { target_state: targetState.value }
    if (comentarios.value) payload.comentarios = comentarios.value
    if (montoAprobado.value != null && montoAprobado.value !== '') payload.monto_aprobado = montoAprobado.value
    if (condiciones.value) payload.condiciones = condiciones.value
    const sig = signaturePayload.value
    if (sig) payload.signature = sig
    return payload
  }

  async function submit() {
    loading.value = true
    error.value = null
    try {
      return await client.transition(buildPayload())
    } catch (e) {
      error.value = e.response?.data ?? { detail: e.message }
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    targetState, comentarios, montoAprobado, condiciones,
    signatureBackend, signatureMode, signatureFields, signaturePayload,
    loading, error, buildPayload, submit,
  }
}
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { useTransition, buildSignaturePayload } from './composables/useTransition.js'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- useTransition`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useTransition.js tests/composables/useTransition.test.js src/index.js
git commit -m "feat: useTransition composable with polymorphic signature shaping"
```

---

### Task 4: `useSeguimientoStore` (Pinia)

**Files:**
- Create: `src/stores/useSeguimientoStore.js`
- Test: `tests/stores/useSeguimientoStore.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `createSinpapelClient` (Task 2).
- Produces: `useSeguimientoStore({ axios, basePath?, resource, pk }) → store` (a live Pinia setup-store instance) exposing refs `estados, historial, historialCount, metadatos, preview, slaActions, loading, error` and actions `cargarEstados(), cargarHistorial(page?), ejecutarTransicion(payload), cargarMetadatos(), guardarMetadatos(values), cargarPreview(targetState), evaluarSla()`. The store also exposes `client`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSeguimientoStore } from '../../src/stores/useSeguimientoStore.js'

function mockAxios() {
  return {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn(),
  }
}

describe('useSeguimientoStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads estados via the client', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValueOnce({ data: [{ id: 1, nombre: 'APROBADA', color: '#0a0' }] })
    const store = useSeguimientoStore({ axios, resource: 'solicitudes', pk: 5 })
    await store.cargarEstados()
    expect(store.estados).toEqual([{ id: 1, nombre: 'APROBADA', color: '#0a0' }])
  })

  it('stores paginated history', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValueOnce({ data: { count: 2, results: [{ history_id: 1 }, { history_id: 2 }] } })
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })
    await store.cargarHistorial()
    expect(store.historialCount).toBe(2)
    expect(store.historial).toHaveLength(2)
  })

  it('ejecutarTransicion refreshes estados + historial', async () => {
    const axios = mockAxios()
    axios.get.mockResolvedValue({ data: [] })
    const store = useSeguimientoStore({ axios, resource: 'r', pk: 1 })
    await store.ejecutarTransicion({ target_state: 'X' })
    expect(axios.post).toHaveBeenCalledWith('/sinpapel/api/r/1/transition/', { target_state: 'X' }, {})
    expect(axios.get).toHaveBeenCalledTimes(2) // estados + historial refresh
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- useSeguimientoStore`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/stores/useSeguimientoStore.js`**

```js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createSinpapelClient } from '../client/sinpapelClient.js'

/**
 * Setup-store factory keyed by (resource, pk). The client lives as a closure
 * const (not reactive state) so non-serializable axios stays out of the store.
 */
export function useSeguimientoStore(options) {
  const id = `seguimiento-${options.resource}-${options.pk}`
  const define = defineStore(id, () => {
    const client = createSinpapelClient(options)
    const estados = ref([])
    const historial = ref([])
    const historialCount = ref(0)
    const metadatos = ref({ schema: [], values: {} })
    const preview = ref(null)
    const slaActions = ref([])
    const loading = ref(false)
    const error = ref(null)

    async function run(fn) {
      loading.value = true
      error.value = null
      try {
        return await fn()
      } catch (e) {
        error.value = e.response?.data ?? { detail: e.message }
        throw e
      } finally {
        loading.value = false
      }
    }

    async function cargarEstados() {
      estados.value = await client.availableTransitions()
    }
    async function cargarHistorial(page = 1) {
      const data = await client.history({ page })
      historial.value = Array.isArray(data) ? data : (data.results ?? [])
      historialCount.value = Array.isArray(data) ? data.length : (data.count ?? historial.value.length)
    }
    async function ejecutarTransicion(payload) {
      return run(async () => {
        const result = await client.transition(payload)
        await cargarEstados()
        await cargarHistorial()
        return result
      })
    }
    async function cargarMetadatos() {
      metadatos.value = await client.getMetadatos()
    }
    async function guardarMetadatos(values) {
      return run(async () => {
        const updated = await client.patchMetadatos(values)
        metadatos.value = { ...metadatos.value, values: updated }
        return updated
      })
    }
    async function cargarPreview(targetState) {
      preview.value = await client.previewTransition(targetState)
      return preview.value
    }
    async function evaluarSla() {
      slaActions.value = await client.slaStatus()
      return slaActions.value
    }

    return {
      client, estados, historial, historialCount, metadatos, preview, slaActions,
      loading, error,
      cargarEstados, cargarHistorial, ejecutarTransicion,
      cargarMetadatos, guardarMetadatos, cargarPreview, evaluarSla,
    }
  })
  return define()
}
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { useSeguimientoStore } from './stores/useSeguimientoStore.js'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- useSeguimientoStore`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stores/useSeguimientoStore.js tests/stores/useSeguimientoStore.test.js src/index.js
git commit -m "feat: per-(resource,pk) Pinia seguimiento store"
```

---

### Task 5: `StateBadge.vue`

**Files:**
- Create: `src/components/StateBadge.vue`
- Test: `tests/components/StateBadge.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `<StateBadge :estado="String" :color="String?" :label="String?" />`. Color precedence: `color` prop → (none) → `--sp-badge-bg` token. Label precedence: `label` prop → humanized `estado` (underscores → spaces).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StateBadge from '../../src/components/StateBadge.vue'

describe('StateBadge', () => {
  it('humanizes the estado name by default', () => {
    const w = mount(StateBadge, { props: { estado: 'EN_REVISION' } })
    expect(w.text()).toContain('EN REVISION')
  })
  it('prefers an explicit label', () => {
    const w = mount(StateBadge, { props: { estado: 'EN_REVISION', label: 'En revisión' } })
    expect(w.text()).toContain('En revisión')
  })
  it('applies the api color when provided', () => {
    const w = mount(StateBadge, { props: { estado: 'X', color: '#0a8f00' } })
    expect(w.attributes('style')).toContain('#0a8f00')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- StateBadge`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/StateBadge.vue`**

```vue
<template>
  <span class="sp-badge" :style="badgeStyle">
    <span class="sp-badge__dot" :style="dotStyle"></span>
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  estado: { type: String, required: true },
  color: { type: String, default: '' },
  label: { type: String, default: '' },
})

const displayLabel = computed(() => props.label || (props.estado || 'N/A').replace(/_/g, ' '))
const badgeStyle = computed(() =>
  props.color
    ? { backgroundColor: `color-mix(in srgb, ${props.color} 16%, white)`, color: props.color }
    : {},
)
const dotStyle = computed(() => (props.color ? { backgroundColor: props.color } : {}))
</script>

<style scoped>
.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-family: var(--sp-font);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--sp-badge-bg);
  color: var(--sp-badge-text);
}
.sp-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--sp-badge-text);
}
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as StateBadge } from './components/StateBadge.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- StateBadge`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/StateBadge.vue tests/components/StateBadge.test.js src/index.js
git commit -m "feat: StateBadge with api-color precedence over tokens"
```

---

### Task 6: `HistoryTimeline.vue`

**Files:**
- Create: `src/components/HistoryTimeline.vue`
- Test: `tests/components/HistoryTimeline.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `<HistoryTimeline :entries="Array" />`. Each entry matches `HistoryEntrySerializer`: `{ history_id, history_type, history_date, history_user, history_change_reason }`. Renders an empty state when `entries` is empty.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTimeline from '../../src/components/HistoryTimeline.vue'

const entries = [
  { history_id: 2, history_type: '~', history_date: '2026-06-19T10:00:00Z', history_user: 'ana', history_change_reason: 'APROBADA' },
  { history_id: 1, history_type: '+', history_date: '2026-06-18T09:00:00Z', history_user: null, history_change_reason: null },
]

describe('HistoryTimeline', () => {
  it('renders one row per entry', () => {
    const w = mount(HistoryTimeline, { props: { entries } })
    expect(w.findAll('.sp-tl-entry')).toHaveLength(2)
  })
  it('falls back to "Sistema" when history_user is null', () => {
    const w = mount(HistoryTimeline, { props: { entries } })
    expect(w.text()).toContain('Sistema')
  })
  it('shows an empty state for no entries', () => {
    const w = mount(HistoryTimeline, { props: { entries: [] } })
    expect(w.find('.sp-tl-empty').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- HistoryTimeline`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/HistoryTimeline.vue`**

```vue
<template>
  <div v-if="entries && entries.length" class="sp-timeline">
    <div
      v-for="(item, idx) in entries"
      :key="item.history_id ?? idx"
      class="sp-tl-entry"
    >
      <div class="sp-tl-left">
        <div class="sp-tl-node">
          <q-icon :name="iconFor(item.history_type)" size="13px" />
        </div>
        <div v-if="idx < entries.length - 1" class="sp-tl-line"></div>
      </div>
      <div class="sp-tl-content">
        <div class="sp-tl-header">
          <span class="sp-tl-reason">{{ item.history_change_reason || labelFor(item.history_type) }}</span>
          <span class="sp-tl-date">{{ formatDate(item.history_date) }}</span>
        </div>
        <div class="sp-tl-user">{{ item.history_user || 'Sistema' }}</div>
      </div>
    </div>
  </div>
  <div v-else class="sp-tl-empty">Sin movimientos registrados</div>
</template>

<script setup>
defineProps({ entries: { type: Array, default: () => [] } })

const ICONS = { '+': 'add_circle', '~': 'edit', '-': 'remove_circle' }
const LABELS = { '+': 'Creado', '~': 'Modificado', '-': 'Eliminado' }
const iconFor = (t) => ICONS[t] || 'circle'
const labelFor = (t) => LABELS[t] || 'Cambio'
const formatDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('es-MX') } catch { return d }
}
</script>

<style scoped>
.sp-timeline { font-family: var(--sp-font); padding: 4px 0; }
.sp-tl-entry { display: flex; gap: 14px; }
.sp-tl-left { display: flex; flex-direction: column; align-items: center; width: 26px; flex-shrink: 0; }
.sp-tl-node {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--sp-color-primary); color: var(--sp-color-on-primary);
}
.sp-tl-line { width: 2px; flex: 1; min-height: 18px; background: var(--sp-border); margin: 4px 0; }
.sp-tl-content {
  flex: 1; background: var(--sp-surface);
  border: 1px solid var(--sp-border); border-left: 3px solid var(--sp-color-primary);
  border-radius: 6px; padding: 9px 13px; margin-bottom: 10px;
}
.sp-tl-header { display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.sp-tl-reason { font-weight: 700; font-size: 12px; color: var(--sp-text); }
.sp-tl-date { font-size: 11px; color: var(--sp-text-muted); white-space: nowrap; }
.sp-tl-user { font-size: 11px; color: var(--sp-text-muted); margin-top: 4px; }
.sp-tl-empty {
  text-align: center; padding: 36px 16px;
  color: var(--sp-text-muted); font-family: var(--sp-font); font-size: 13px;
}
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as HistoryTimeline } from './components/HistoryTimeline.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- HistoryTimeline`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/HistoryTimeline.vue tests/components/HistoryTimeline.test.js src/index.js
git commit -m "feat: HistoryTimeline over django-simple-history shape"
```

---

### Task 7: `TransitionDialog.vue`

**Files:**
- Create: `src/components/TransitionDialog.vue`
- Test: `tests/components/TransitionDialog.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `useTransition` (Task 3), `StateBadge` (Task 5).
- Produces: `<TransitionDialog v-model="Boolean" :client :current-state="String" :estados="Array" @transitioned="result" />`. `estados` are `[{id,nombre,color}]` from `availableTransitions`. On submit, calls `useTransition.submit()`, emits `transitioned` with the result, and closes.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransitionDialog from '../../src/components/TransitionDialog.vue'

const estados = [{ id: 1, nombre: 'APROBADA', color: '#0a0' }, { id: 2, nombre: 'RECHAZADA', color: '#a00' }]

describe('TransitionDialog', () => {
  it('submits the selected transition via the client', async () => {
    const client = { transition: vi.fn().mockResolvedValue({ success: true, estado_nuevo: 'APROBADA' }) }
    const w = mount(TransitionDialog, {
      props: { modelValue: true, client, currentState: 'EN_REVISION', estados },
    })
    w.vm.tx.targetState.value = 'APROBADA'
    await w.vm.onSubmit()
    expect(client.transition).toHaveBeenCalledWith({ target_state: 'APROBADA' })
    expect(w.emitted('transitioned')[0][0]).toEqual({ success: true, estado_nuevo: 'APROBADA' })
    expect(w.emitted('update:modelValue').at(-1)).toEqual([false])
  })

  it('does not submit without a target state', async () => {
    const client = { transition: vi.fn() }
    const w = mount(TransitionDialog, {
      props: { modelValue: true, client, currentState: 'X', estados },
    })
    await w.vm.onSubmit()
    expect(client.transition).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- TransitionDialog`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/TransitionDialog.vue`**

```vue
<template>
  <q-dialog v-model="visible" persistent>
    <q-card class="sp-dialog">
      <div class="sp-dialog__head">
        <q-icon name="swap_horiz" size="18px" />
        <span>Cambiar estado</span>
        <q-space />
        <q-btn icon="close" flat round dense size="sm" @click="visible = false" />
      </div>

      <div class="sp-dialog__current">
        <span class="sp-dialog__label">Estado actual</span>
        <state-badge :estado="currentState" />
      </div>

      <q-card-section>
        <q-form @submit="onSubmit" class="sp-form">
          <div class="sp-field">
            <label class="sp-label">Nuevo estado *</label>
            <select v-model="tx.targetState.value" class="sp-select">
              <option :value="null" disabled>Selecciona…</option>
              <option v-for="e in estados" :key="e.id ?? e.nombre" :value="e.nombre">
                {{ (e.nombre || '').replace(/_/g, ' ') }}
              </option>
            </select>
          </div>

          <div class="sp-field">
            <label class="sp-label">Comentarios</label>
            <textarea v-model="tx.comentarios.value" rows="3" class="sp-input"></textarea>
          </div>

          <div class="sp-field">
            <label class="sp-label">Monto aprobado (opcional)</label>
            <input v-model.number="tx.montoAprobado.value" type="number" class="sp-input" />
          </div>

          <div class="sp-field">
            <label class="sp-label">Condiciones (opcional)</label>
            <textarea v-model="tx.condiciones.value" rows="2" class="sp-input"></textarea>
          </div>

          <!-- Signature backend selector -->
          <fieldset class="sp-sig">
            <legend>Firma</legend>
            <select v-model="tx.signatureBackend.value" class="sp-select">
              <option :value="null">Sin firma</option>
              <option value="fiel">FIEL (e.firma SAT)</option>
              <option value="manual">Manual (escaneo + testigo)</option>
              <option value="fake">Fake (pruebas)</option>
            </select>

            <template v-if="tx.signatureBackend.value === 'fiel'">
              <select v-model="tx.signatureMode.value" class="sp-select">
                <option value="client-side">Cliente (firma_b64)</option>
                <option value="server-side">Servidor (.cer/.key)</option>
              </select>
              <template v-if="tx.signatureMode.value === 'client-side'">
                <input v-model="tx.signatureFields.firma_b64" placeholder="firma_b64" class="sp-input" />
                <input v-model="tx.signatureFields.certificado_cer_b64" placeholder="certificado_cer_b64" class="sp-input" />
              </template>
              <template v-else>
                <input type="file" accept=".cer" @change="e => tx.signatureFields.cer_file = e.target.files[0]" />
                <input type="file" accept=".key" @change="e => tx.signatureFields.key_file = e.target.files[0]" />
                <input v-model="tx.signatureFields.password" type="password" placeholder="Contraseña e.firma" class="sp-input" />
              </template>
            </template>
            <template v-else-if="tx.signatureBackend.value === 'manual'">
              <input v-model="tx.signatureFields.scanned_image_path" placeholder="Ruta del escaneo" class="sp-input" />
              <input v-model="tx.signatureFields.witness_name" placeholder="Nombre del testigo" class="sp-input" />
            </template>
          </fieldset>

          <p v-if="tx.error.value" class="sp-error">{{ errorText }}</p>

          <div class="sp-actions">
            <button type="button" class="sp-btn sp-btn--ghost" @click="visible = false">Cancelar</button>
            <button type="submit" class="sp-btn sp-btn--primary" :disabled="tx.loading.value">
              {{ tx.loading.value ? 'Enviando…' : 'Confirmar' }}
            </button>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useTransition } from '../composables/useTransition.js'
import StateBadge from './StateBadge.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  client: { type: Object, required: true },
  currentState: { type: String, default: '' },
  estados: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'transitioned'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const tx = useTransition(props.client)

const errorText = computed(() => {
  const e = tx.error.value
  if (!e) return ''
  if (typeof e === 'string') return e
  return e.detail || JSON.stringify(e)
})

async function onSubmit() {
  if (!tx.targetState.value) return
  const result = await tx.submit()
  emit('transitioned', result)
  visible.value = false
}

defineExpose({ tx, onSubmit })
</script>

<style scoped>
.sp-dialog { width: min(100vw - 24px, 560px); display: flex; flex-direction: column; border-radius: var(--sp-radius); overflow: hidden; }
.sp-dialog__head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--sp-color-primary); color: var(--sp-color-on-primary); font-weight: 700; }
.sp-dialog__current { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--sp-surface-alt); border-bottom: 1px solid var(--sp-border); }
.sp-dialog__label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--sp-text-muted); }
.sp-form { display: flex; flex-direction: column; gap: 12px; }
.sp-field { display: flex; flex-direction: column; gap: 4px; }
.sp-label { font-size: 12px; font-weight: 600; color: var(--sp-text); }
.sp-input, .sp-select { padding: 7px 10px; border: 1px solid var(--sp-border); border-radius: 6px; font: inherit; color: var(--sp-text); background: var(--sp-surface); }
.sp-sig { border: 1px solid var(--sp-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.sp-sig legend { font-size: 12px; font-weight: 700; color: var(--sp-text); padding: 0 4px; }
.sp-error { color: var(--sp-danger); font-size: 12px; margin: 0; }
.sp-actions { display: flex; justify-content: flex-end; gap: 10px; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; }
.sp-btn--ghost { background: transparent; color: var(--sp-text-muted); border: 1px solid var(--sp-border); }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as TransitionDialog } from './components/TransitionDialog.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- TransitionDialog`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/TransitionDialog.vue tests/components/TransitionDialog.test.js src/index.js
git commit -m "feat: TransitionDialog with full signature-backend selector"
```

---

### Task 8: `PreviewTransitionPanel.vue`

**Files:**
- Create: `src/components/PreviewTransitionPanel.vue`
- Test: `tests/components/PreviewTransitionPanel.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `<PreviewTransitionPanel :client :target-state="String" />`. On mount / `targetState` change, calls `client.previewTransition(targetState)` and renders the `PreviewTransitionResponseSerializer` shape: `permitido`, `razones_bloqueo[]`, `documentos_faltantes[]`, `predicados_fallidos[]`, `aprobadores_requeridos[]`, `side_effects[]`, `historial_reciente[]`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PreviewTransitionPanel from '../../src/components/PreviewTransitionPanel.vue'

describe('PreviewTransitionPanel', () => {
  it('renders a blocked verdict with reasons', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: false,
      razones_bloqueo: [{ tipo: 'predicado', detalle: 'monto excede' }],
      documentos_faltantes: [], predicados_fallidos: [], aprobadores_requeridos: [],
      side_effects: [], historial_reciente: [],
    }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'APROBADA' } })
    await flushPromises()
    expect(client.previewTransition).toHaveBeenCalledWith('APROBADA')
    expect(w.text()).toContain('Bloqueada')
    expect(w.text()).toContain('monto excede')
  })

  it('renders an allowed verdict', async () => {
    const client = { previewTransition: vi.fn().mockResolvedValue({
      permitido: true, razones_bloqueo: [], documentos_faltantes: [], predicados_fallidos: [],
      aprobadores_requeridos: [], side_effects: ['notificar'], historial_reciente: [],
    }) }
    const w = mount(PreviewTransitionPanel, { props: { client, targetState: 'X' } })
    await flushPromises()
    expect(w.text()).toContain('Permitida')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- PreviewTransitionPanel`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/PreviewTransitionPanel.vue`**

```vue
<template>
  <div class="sp-preview">
    <div v-if="loading" class="sp-preview__muted">Evaluando…</div>
    <template v-else-if="report">
      <div class="sp-preview__verdict" :class="report.permitido ? 'is-ok' : 'is-block'">
        <q-icon :name="report.permitido ? 'check_circle' : 'block'" size="16px" />
        {{ report.permitido ? 'Permitida' : 'Bloqueada' }}
      </div>

      <section v-for="grp in groups" :key="grp.key" v-show="grp.items.length" class="sp-preview__group">
        <h4>{{ grp.title }}</h4>
        <ul>
          <li v-for="(it, i) in grp.items" :key="i">{{ render(it) }}</li>
        </ul>
      </section>
    </template>
    <div v-else class="sp-preview__muted">Selecciona un estado destino para previsualizar.</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  client: { type: Object, required: true },
  targetState: { type: String, default: '' },
})

const report = ref(null)
const loading = ref(false)

const groups = computed(() => {
  if (!report.value) return []
  return [
    { key: 'razones_bloqueo', title: 'Razones de bloqueo', items: report.value.razones_bloqueo || [] },
    { key: 'documentos_faltantes', title: 'Documentos faltantes', items: report.value.documentos_faltantes || [] },
    { key: 'predicados_fallidos', title: 'Predicados fallidos', items: report.value.predicados_fallidos || [] },
    { key: 'aprobadores_requeridos', title: 'Aprobadores requeridos', items: report.value.aprobadores_requeridos || [] },
    { key: 'side_effects', title: 'Efectos secundarios', items: report.value.side_effects || [] },
    { key: 'historial_reciente', title: 'Historial reciente', items: report.value.historial_reciente || [] },
  ]
})

const render = (it) =>
  typeof it === 'string' ? it : (it.detalle || it.nombre || JSON.stringify(it))

async function load() {
  if (!props.targetState) { report.value = null; return }
  loading.value = true
  try {
    report.value = await props.client.previewTransition(props.targetState)
  } finally {
    loading.value = false
  }
}

watch(() => props.targetState, load, { immediate: true })
</script>

<style scoped>
.sp-preview { font-family: var(--sp-font); display: flex; flex-direction: column; gap: 12px; }
.sp-preview__muted { color: var(--sp-text-muted); font-size: 13px; }
.sp-preview__verdict { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 6px 12px; border-radius: 20px; width: fit-content; }
.sp-preview__verdict.is-ok { background: color-mix(in srgb, var(--sp-ok) 14%, white); color: var(--sp-ok); }
.sp-preview__verdict.is-block { background: color-mix(in srgb, var(--sp-danger) 12%, white); color: var(--sp-danger); }
.sp-preview__group h4 { margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--sp-text-muted); }
.sp-preview__group ul { margin: 0; padding-left: 18px; }
.sp-preview__group li { font-size: 13px; color: var(--sp-text); }
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as PreviewTransitionPanel } from './components/PreviewTransitionPanel.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- PreviewTransitionPanel`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PreviewTransitionPanel.vue tests/components/PreviewTransitionPanel.test.js src/index.js
git commit -m "feat: read-only PreviewTransitionPanel"
```

---

### Task 9: `MetadatosForm.vue`

**Files:**
- Create: `src/components/MetadatosForm.vue`
- Test: `tests/components/MetadatosForm.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `<MetadatosForm :client @saved="values" />`. On mount, calls `client.getMetadatos()` → `{ schema: CampoMetadato[], values }`. `CampoMetadato`: `{ nombre, tipo, requerido, default, choices, etiqueta, ayuda }`. On submit, calls `client.patchMetadatos(values)` and emits `saved`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MetadatosForm from '../../src/components/MetadatosForm.vue'

const schema = [
  { nombre: 'monto', tipo: 'int', requerido: true, default: null, choices: null, etiqueta: 'Monto', ayuda: '' },
  { nombre: 'tipo', tipo: 'str', requerido: false, default: 'A', choices: ['A', 'B'], etiqueta: 'Tipo', ayuda: 'Elige' },
]

describe('MetadatosForm', () => {
  it('renders a field per schema campo with current values', async () => {
    const client = {
      getMetadatos: vi.fn().mockResolvedValue({ schema, values: { monto: 500, tipo: 'B' } }),
      patchMetadatos: vi.fn(),
    }
    const w = mount(MetadatosForm, { props: { client } })
    await flushPromises()
    expect(w.findAll('.sp-meta-field')).toHaveLength(2)
    expect(w.find('input[name="monto"]').element.value).toBe('500')
  })

  it('patches edited values and emits saved', async () => {
    const client = {
      getMetadatos: vi.fn().mockResolvedValue({ schema, values: { monto: 1, tipo: 'A' } }),
      patchMetadatos: vi.fn().mockResolvedValue({ monto: 2, tipo: 'A' }),
    }
    const w = mount(MetadatosForm, { props: { client } })
    await flushPromises()
    w.vm.values.monto = 2
    await w.vm.onSubmit()
    expect(client.patchMetadatos).toHaveBeenCalledWith({ monto: 2, tipo: 'A' })
    expect(w.emitted('saved')[0][0]).toEqual({ monto: 2, tipo: 'A' })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- MetadatosForm`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/MetadatosForm.vue`**

```vue
<template>
  <form class="sp-meta" @submit.prevent="onSubmit">
    <div v-for="campo in schema" :key="campo.nombre" class="sp-meta-field">
      <label class="sp-label">
        {{ campo.etiqueta || campo.nombre }}<span v-if="campo.requerido"> *</span>
      </label>
      <select v-if="campo.choices && campo.choices.length" v-model="values[campo.nombre]" :name="campo.nombre" class="sp-input">
        <option v-for="opt in campo.choices" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <input v-else-if="campo.tipo === 'bool'" v-model="values[campo.nombre]" :name="campo.nombre" type="checkbox" />
      <input v-else v-model="values[campo.nombre]" :name="campo.nombre" :type="inputType(campo.tipo)" class="sp-input" />
      <small v-if="campo.ayuda" class="sp-help">{{ campo.ayuda }}</small>
      <small v-if="fieldErrors[campo.nombre]" class="sp-error">{{ fieldErrors[campo.nombre] }}</small>
    </div>

    <div class="sp-actions">
      <button type="submit" class="sp-btn sp-btn--primary" :disabled="loading">
        {{ loading ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['saved'])

const schema = ref([])
const values = reactive({})
const fieldErrors = reactive({})
const loading = ref(false)

const inputType = (t) => (t === 'int' || t === 'Decimal' ? 'number' : t === 'date' ? 'date' : 'text')

async function load() {
  const data = await props.client.getMetadatos()
  schema.value = data.schema || []
  Object.keys(values).forEach((k) => delete values[k])
  Object.assign(values, data.values || {})
}

async function onSubmit() {
  loading.value = true
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k])
  try {
    const updated = await props.client.patchMetadatos({ ...values })
    emit('saved', updated)
  } catch (e) {
    const body = e.response?.data
    if (body && typeof body === 'object') {
      for (const [k, v] of Object.entries(body)) fieldErrors[k] = Array.isArray(v) ? v.join(' ') : String(v)
    }
  } finally {
    loading.value = false
  }
}

defineExpose({ values, onSubmit })
load()
</script>

<style scoped>
.sp-meta { display: flex; flex-direction: column; gap: 12px; font-family: var(--sp-font); }
.sp-meta-field { display: flex; flex-direction: column; gap: 4px; }
.sp-label { font-size: 12px; font-weight: 600; color: var(--sp-text); }
.sp-input { padding: 7px 10px; border: 1px solid var(--sp-border); border-radius: 6px; font: inherit; color: var(--sp-text); background: var(--sp-surface); }
.sp-help { font-size: 11px; color: var(--sp-text-muted); }
.sp-error { font-size: 11px; color: var(--sp-danger); }
.sp-actions { display: flex; justify-content: flex-end; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as MetadatosForm } from './components/MetadatosForm.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- MetadatosForm`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/MetadatosForm.vue tests/components/MetadatosForm.test.js src/index.js
git commit -m "feat: schema-driven MetadatosForm (GET/PATCH)"
```

---

### Task 10: `SlaStatusPanel.vue`

**Files:**
- Create: `src/components/SlaStatusPanel.vue`
- Test: `tests/components/SlaStatusPanel.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `<SlaStatusPanel :client />`. A button triggers `client.slaStatus()` (POST, admin-only). Renders the returned action list, or an "up to date" empty state when `[]`.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SlaStatusPanel from '../../src/components/SlaStatusPanel.vue'

describe('SlaStatusPanel', () => {
  it('evaluates SLA and lists actions', async () => {
    const client = { slaStatus: vi.fn().mockResolvedValue([{ accion: 'alertar', estado: 'EN_REVISION' }]) }
    const w = mount(SlaStatusPanel, { props: { client } })
    await w.vm.evaluate()
    expect(client.slaStatus).toHaveBeenCalled()
    expect(w.text()).toContain('alertar')
  })

  it('shows an up-to-date state when no actions', async () => {
    const client = { slaStatus: vi.fn().mockResolvedValue([]) }
    const w = mount(SlaStatusPanel, { props: { client } })
    await w.vm.evaluate()
    expect(w.text()).toContain('Sin acciones')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- SlaStatusPanel`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/SlaStatusPanel.vue`**

```vue
<template>
  <div class="sp-sla">
    <button class="sp-btn sp-btn--primary" :disabled="loading" @click="evaluate">
      {{ loading ? 'Evaluando…' : 'Evaluar SLA' }}
    </button>

    <ul v-if="actions.length" class="sp-sla__list">
      <li v-for="(a, i) in actions" :key="i">
        <strong>{{ a.accion || a.action || 'acción' }}</strong>
        <span v-if="a.estado"> · {{ a.estado }}</span>
      </li>
    </ul>
    <p v-else-if="evaluated" class="sp-sla__muted">Sin acciones — al día o no aplica.</p>
    <p v-if="error" class="sp-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ client: { type: Object, required: true } })

const actions = ref([])
const loading = ref(false)
const evaluated = ref(false)
const error = ref('')

async function evaluate() {
  loading.value = true
  error.value = ''
  try {
    actions.value = await props.client.slaStatus()
    evaluated.value = true
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

defineExpose({ evaluate })
</script>

<style scoped>
.sp-sla { display: flex; flex-direction: column; gap: 10px; font-family: var(--sp-font); }
.sp-sla__list { margin: 0; padding-left: 18px; }
.sp-sla__list li { font-size: 13px; color: var(--sp-text); }
.sp-sla__muted { color: var(--sp-text-muted); font-size: 13px; margin: 0; }
.sp-error { color: var(--sp-danger); font-size: 12px; margin: 0; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; width: fit-content; }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as SlaStatusPanel } from './components/SlaStatusPanel.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- SlaStatusPanel`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SlaStatusPanel.vue tests/components/SlaStatusPanel.test.js src/index.js
git commit -m "feat: SlaStatusPanel (admin SLA evaluation trigger)"
```

---

### Task 11: `SeguimientoPanel.vue` (composed orchestrator)

**Files:**
- Create: `src/components/SeguimientoPanel.vue`
- Test: `tests/components/SeguimientoPanel.test.js`
- Modify: `src/index.js`

**Interfaces:**
- Consumes: `useSeguimientoStore` (Task 4) + all components (Tasks 5–10).
- Produces: `<SeguimientoPanel :axios :base-path? :resource :pk :can-evaluate-sla? />`. Creates the store, loads `estados` + `historial` on mount, renders a StateBadge header, a "Cambiar estado" button → TransitionDialog, and tabs: Historial / Preview / Metadatos / SLA (SLA tab only when `canEvaluateSla`).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import SeguimientoPanel from '../../src/components/SeguimientoPanel.vue'

function mockAxios() {
  return {
    get: vi.fn((url) =>
      url.includes('available-transitions')
        ? Promise.resolve({ data: [{ id: 1, nombre: 'APROBADA', color: '#0a0' }] })
        : Promise.resolve({ data: { count: 0, results: [] } }),
    ),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn(),
  }
}

describe('SeguimientoPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads estados + historial on mount', async () => {
    const axios = mockAxios()
    mount(SeguimientoPanel, { props: { axios, resource: 'solicitudes', pk: 1 } })
    await flushPromises()
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/1/available-transitions/')
    expect(axios.get).toHaveBeenCalledWith('/sinpapel/api/solicitudes/1/history/', { params: { page: 1 } })
  })

  it('hides the SLA tab unless canEvaluateSla', async () => {
    const axios = mockAxios()
    const w = mount(SeguimientoPanel, { props: { axios, resource: 'r', pk: 1 } })
    await flushPromises()
    expect(w.text()).not.toContain('SLA')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- SeguimientoPanel`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/SeguimientoPanel.vue`**

```vue
<template>
  <div class="sp-panel">
    <header class="sp-panel__head">
      <state-badge :estado="currentState" />
      <button class="sp-btn sp-btn--primary" :disabled="!store.estados.length" @click="dialog = true">
        Cambiar estado
      </button>
    </header>

    <nav class="sp-panel__tabs">
      <button v-for="t in visibleTabs" :key="t.key" class="sp-tab" :class="{ 'is-active': tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </nav>

    <section class="sp-panel__body">
      <history-timeline v-show="tab === 'historial'" :entries="store.historial" />
      <preview-transition-panel v-if="tab === 'preview'" :client="store.client" :target-state="previewTarget" />
      <div v-if="tab === 'preview'" class="sp-panel__preview-pick">
        <label class="sp-label">Estado destino</label>
        <select v-model="previewTarget" class="sp-input">
          <option value="">—</option>
          <option v-for="e in store.estados" :key="e.id ?? e.nombre" :value="e.nombre">{{ e.nombre }}</option>
        </select>
      </div>
      <metadatos-form v-if="tab === 'metadatos'" :client="store.client" @saved="store.cargarMetadatos()" />
      <sla-status-panel v-if="tab === 'sla' && canEvaluateSla" :client="store.client" />
    </section>

    <transition-dialog
      v-model="dialog"
      :client="store.client"
      :current-state="currentState"
      :estados="store.estados"
      @transitioned="onTransitioned"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSeguimientoStore } from '../stores/useSeguimientoStore.js'
import StateBadge from './StateBadge.vue'
import HistoryTimeline from './HistoryTimeline.vue'
import TransitionDialog from './TransitionDialog.vue'
import PreviewTransitionPanel from './PreviewTransitionPanel.vue'
import MetadatosForm from './MetadatosForm.vue'
import SlaStatusPanel from './SlaStatusPanel.vue'

const props = defineProps({
  axios: { type: Object, required: true },
  basePath: { type: String, default: '/sinpapel/api' },
  resource: { type: String, required: true },
  pk: { type: [Number, String], required: true },
  currentState: { type: String, default: '' },
  canEvaluateSla: { type: Boolean, default: false },
})

const store = useSeguimientoStore({
  axios: props.axios, basePath: props.basePath, resource: props.resource, pk: props.pk,
})

const dialog = ref(false)
const tab = ref('historial')
const previewTarget = ref('')

const visibleTabs = computed(() => {
  const tabs = [
    { key: 'historial', label: 'Historial' },
    { key: 'preview', label: 'Previsualizar' },
    { key: 'metadatos', label: 'Metadatos' },
  ]
  if (props.canEvaluateSla) tabs.push({ key: 'sla', label: 'SLA' })
  return tabs
})

async function load() {
  await store.cargarEstados()
  await store.cargarHistorial()
}

async function onTransitioned() {
  await load()
}

watch(() => tab.value, (t) => { if (t === 'metadatos') store.cargarMetadatos() })

load()
</script>

<style scoped>
.sp-panel { font-family: var(--sp-font); border: 1px solid var(--sp-border); border-radius: var(--sp-radius); overflow: hidden; background: var(--sp-surface); }
.sp-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--sp-border); background: var(--sp-surface-alt); }
.sp-panel__tabs { display: flex; border-bottom: 1px solid var(--sp-border); }
.sp-tab { padding: 10px 16px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font: inherit; font-weight: 600; color: var(--sp-text-muted); }
.sp-tab.is-active { color: var(--sp-color-primary); border-bottom-color: var(--sp-color-primary); }
.sp-panel__body { padding: 16px; }
.sp-panel__preview-pick { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; max-width: 280px; }
.sp-label { font-size: 12px; font-weight: 600; color: var(--sp-text); }
.sp-input { padding: 7px 10px; border: 1px solid var(--sp-border); border-radius: 6px; font: inherit; }
.sp-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font: inherit; font-weight: 600; }
.sp-btn--primary { background: var(--sp-color-primary); color: var(--sp-color-on-primary); }
.sp-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: Add export to `src/index.js`**

```js
export { default as SeguimientoPanel } from './components/SeguimientoPanel.vue'
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- SeguimientoPanel`
Expected: PASS. Then run the full suite: `npm test` → all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/SeguimientoPanel.vue tests/components/SeguimientoPanel.test.js src/index.js
git commit -m "feat: composed SeguimientoPanel (badge + tabs + dialog)"
```

---

### Task 12: Demo app

**Files:**
- Create: `demo/main.js`, `demo/App.vue`
- (Uses `index.html` from Task 1)

**Interfaces:**
- Consumes: the public `src/index.js` exports + Quasar + Pinia.
- Produces: a runnable dev app (`npm run dev`) with a config form (basePath, resource, pk, current state, canEvaluateSla) that mounts `<SeguimientoPanel>` against a consumer-owned axios instance.

- [ ] **Step 1: Write `demo/main.js`**

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'
import 'quasar/src/css/index.sass'
import '@quasar/extras/material-icons/material-icons.css'
import App from './App.vue'

createApp(App).use(createPinia()).use(Quasar, {}).mount('#app')
```

- [ ] **Step 2: Write `demo/App.vue`**

```vue
<template>
  <div class="demo">
    <h1>sinpapel-vue · demo</h1>
    <form class="demo__cfg" @submit.prevent="apply">
      <label>Base path <input v-model="cfg.basePath" /></label>
      <label>Resource <input v-model="cfg.resource" /></label>
      <label>PK <input v-model="cfg.pk" /></label>
      <label>Estado actual <input v-model="cfg.currentState" /></label>
      <label><input v-model="cfg.canEvaluateSla" type="checkbox" /> SLA admin</label>
      <button type="submit">Montar</button>
    </form>

    <seguimiento-panel
      v-if="mounted"
      :key="mountKey"
      :axios="http"
      :base-path="active.basePath"
      :resource="active.resource"
      :pk="active.pk"
      :current-state="active.currentState"
      :can-evaluate-sla="active.canEvaluateSla"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { SeguimientoPanel } from '../src/index.js'

// Consumer owns the axios instance (auth, baseURL, interceptors).
const http = axios.create({ withCredentials: true })

const cfg = reactive({ basePath: '/sinpapel/api', resource: 'solicitudes', pk: '1', currentState: 'EN_REVISION', canEvaluateSla: false })
const active = reactive({ ...cfg })
const mounted = ref(false)
const mountKey = ref(0)

function apply() {
  Object.assign(active, cfg)
  mounted.value = true
  mountKey.value += 1
}
</script>

<style>
body { margin: 0; }
.demo { max-width: 760px; margin: 0 auto; padding: 24px; font-family: 'Inter', system-ui, sans-serif; }
.demo h1 { font-size: 20px; }
.demo__cfg { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px; padding: 16px; border: 1px solid #dfe3e8; border-radius: 8px; }
.demo__cfg label { display: flex; flex-direction: column; font-size: 12px; gap: 4px; }
.demo__cfg input { padding: 6px 8px; border: 1px solid #dfe3e8; border-radius: 6px; }
.demo__cfg button { padding: 8px 16px; border: none; border-radius: 6px; background: #3a4a5c; color: #fff; cursor: pointer; }
</style>
```

- [ ] **Step 3: Run the dev server (manual smoke)**

Run: `npm run dev`
Expected: Vite serves at `http://localhost:5173`; the demo renders the config form. (Live data needs a running `sinpapel-drf` reachable at `basePath`; without one, the panel mounts and shows empty/loading states — that alone confirms wiring.)

- [ ] **Step 4: Verify the library build succeeds**

Run: `npm run build`
Expected: emits `dist/sinpapel-vue.js`, `dist/sinpapel-vue.umd.cjs`, and `dist/sinpapel-vue.css`; `vue`/`pinia`/`quasar` are NOT bundled.

- [ ] **Step 5: Commit**

```bash
git add demo/main.js demo/App.vue
git commit -m "feat: demo app mounting SeguimientoPanel against a configurable backend"
```

---

### Task 13: rai-frontend-gates integration + README

**Files:**
- Create: `README.md`
- Modify: `package.json` (devDependency + gate scripts)
- Create: `.rai-frontend/` baseline (generated by snapshot)

**Interfaces:**
- Consumes: the passing `vitest` suite (Tasks 2–11).
- Produces: `rai-frontend gate check tests` as the enforced gate + a recorded baseline; a README documenting install, usage, theming, and the history-shape gap.

- [ ] **Step 1: Add `rai-frontend-gates` as a dev dependency**

Run:
```bash
npm install --save-dev "rai-frontend-gates @ git+ssh://git@github.com/aprendomx/rai-frontend-gates.git@v0.1.1"
```
Expected: installs the wrapper CLI (`rai-frontend`).

- [ ] **Step 2: Add gate scripts to `package.json`**

Add to the `"scripts"` block:

```json
"gate:tests": "rai-frontend gate check tests --verbose",
"gate:baseline": "rai-frontend baseline snapshot"
```

- [ ] **Step 3: Snapshot the baseline**

Run: `npm run gate:baseline`
Expected: writes `.rai-frontend/` baseline reflecting the current green suite.

- [ ] **Step 4: Verify the gate passes**

Run: `npm run gate:tests`
Expected: `baseline: 0 | current: 0 | delta: +0 new, -0 fixed` (or equivalent all-green output). The tests gate passes.

- [ ] **Step 5: Write `README.md`**

````markdown
# @aprendomx/sinpapel-vue

Vue 3 workflow-tracking widgets for the [`sinpapel-drf`](https://github.com/aprendomx/sinpapel-drf) REST API. Ported and generalized from the `creditos` workflow UI.

## Install

```bash
npm install @aprendomx/sinpapel-vue
# peer deps:
npm install vue pinia quasar
```

Quasar is a **hard peer dependency** (the widgets reuse `q-*` components).

## Usage

```vue
<script setup>
import axios from 'axios'
import { SeguimientoPanel } from '@aprendomx/sinpapel-vue'
import '@aprendomx/sinpapel-vue/style.css'

const http = axios.create({ withCredentials: true }) // you own auth/baseURL
</script>

<template>
  <SeguimientoPanel
    :axios="http"
    base-path="/sinpapel/api"
    resource="solicitudes"
    :pk="42"
    current-state="EN_REVISION"
  />
</template>
```

`resource` is the `effective_slug` of your `@workflow_enabled` model (no auto-discovery in v1).

## Components

`SeguimientoPanel` (composed), `StateBadge`, `HistoryTimeline`, `TransitionDialog`, `PreviewTransitionPanel`, `MetadatosForm`, `SlaStatusPanel`. Plus `createSinpapelClient`, `useTransition`, `useSeguimientoStore`.

## Theming

Override the `--sp-*` CSS variables (see `src/styles/tokens.css`) in your own scope. State colors prefer the API's `color` field, falling back to the tokens.

## Known limitation — history shape

`GET …/history/` returns thin django-simple-history records (`history_id`, `history_type`, `history_date`, `history_user`, `history_change_reason`). The timeline reflects that; it does not show rich per-transition comments/amounts/signatures unless your backend exposes them.

## Develop

```bash
npm install
npm run dev      # demo app
npm test         # vitest (the enforced gate)
npm run build    # library build → dist/
```
````

- [ ] **Step 6: Commit**

```bash
git add README.md package.json package-lock.json .rai-frontend
git commit -m "chore: rai-frontend-gates tests gate + README"
```

---

## Self-Review

**1. Spec coverage:**
- Library + demo app → Tasks 1, 12. ✓
- Quasar peer dep → package.json peerDeps (T1), `q-*` in components (T7, T11), tests stub them (T1). ✓
- Neutral CSS-var theming → `tokens.css` (T1), all components reference `--sp-*` (T5–T11). ✓
- Core widget set (StateBadge, HistoryTimeline, TransitionDialog, PreviewTransitionPanel, MetadatosForm, SlaStatusPanel, SeguimientoPanel, client, store) → Tasks 2,4,5,6,7,8,9,10,11. ✓
- Injected axios / no boot coupling → client signature (T2), demo (T12), README (T13). ✓
- Endpoint contracts (available-transitions/transition/preview/history/metadatos/sla) → client (T2), exercised across components. ✓
- Polymorphic signature dispatch → `buildSignaturePayload` + `useTransition` (T3), encoding in `buildTransitionRequest` (T2), UI in TransitionDialog (T7). ✓
- rai-frontend-gates, tests as enforced gate → Task 13. ✓
- History-shape gap documented → README (T13), HistoryTimeline thin shape (T6). ✓

**2. Placeholder scan:** No TBD/TODO; every code step has full code; every command has expected output.

**3. Type/name consistency:** `createSinpapelClient`, `buildTransitionRequest`, `buildSignaturePayload`, `useTransition`, `useSeguimientoStore`, `store.client`, `store.estados`, `store.historial`, `store.cargarEstados/cargarHistorial/ejecutarTransicion/cargarMetadatos/cargarPreview/evaluarSla` — used identically across Tasks 2–12. Component prop names (`client`, `estados`, `currentState`/`current-state`, `targetState`/`target-state`, `canEvaluateSla`/`can-evaluate-sla`) consistent between definition and consumption (T11). ✓
