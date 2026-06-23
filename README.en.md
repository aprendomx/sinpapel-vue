# @aprendomx/sinpapel-vue

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Vue 3 component library for workflow tracking, consuming the [`sinpapel-drf`](https://github.com/aprendomx/sinpapel-drf) REST API. Generalized from the `creditos` project's workflow UI.

---

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Components](#components)
- [Client API](#client-api)
- [Composables](#composables)
- [Store](#store)
- [Internationalization (i18n)](#internationalization-i18n)
- [TypeScript](#typescript)
- [Theming](#theming)
- [Features](#features)
- [Known limitations](#known-limitations)
- [Development](#development)
- [CI/CD](#cicd)
- [Publishing](#publishing)
- [License](#license)

---

## Installation

```bash
npm install @aprendomx/sinpapel-vue
# required peer dependencies:
npm install vue pinia quasar
```

> **Note:** Quasar is a **hard peer dependency**. Widgets reuse `q-*` components (e.g., `q-dialog`, `q-icon`).

---

## Quick start

```vue
<script setup>
import axios from 'axios'
import { SeguimientoPanel } from '@aprendomx/sinpapel-vue'
import '@aprendomx/sinpapel-vue/style.css'

const http = axios.create({ withCredentials: true })
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

The `resource` prop must be the `effective_slug` of the model decorated with `@workflow_enabled`. There is no auto-discovery in v1.

> **Important:** `SeguimientoPanel` creates its store from the initial props. If `pk` or `resource` change dynamically, pass `:key="pk"` to force a remount.

---

## Components

### SeguimientoPanel

Main composed widget. Renders the current state badge, tabs (History / Preview / Metadata / SLA) and the transition dialog.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `axios` | `Object` | Yes | — | Axios instance (auth, baseURL, interceptors) |
| `basePath` | `string` | No | `/sinpapel/api` | Base path where the API is mounted |
| `resource` | `string` | Yes | — | Resource slug (effective_slug) |
| `pk` | `number \| string` | Yes | — | Instance ID |
| `currentState` | `string` | No | `''` | Current state to show in the badge |
| `canEvaluateSla` | `boolean` | No | `false` | Show the SLA tab |
| `locale` | `string` | No | `'es'` | Language (`es` or `en`) |

**Emits:** none (everything handled internally via the store).

### StateBadge

State pill with a color dot.

**Props:**

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `estado` | `string` | Yes | — |
| `color` | `string` | No | `''` |
| `label` | `string` | No | `''` |

The default label humanizes the state name (`EN_REVISION` → `EN REVISION`). If `color` is passed, `color-mix` is used for the background.

### HistoryTimeline

Vertical timeline over history entries.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `entries` | `Array` | `[]` | History rows |
| `page` | `number` | `1` | Current page |
| `pageSize` | `number` | `0` | Page size (0 = no pagination) |
| `count` | `number` | `0` | Total records |

**Emits:** `prev`, `next`.

### TransitionDialog

Modal dialog to execute a state transition. Includes target state selector, comments, approved amount, conditions and polymorphic signature (FIEL client-side/server-side, manual, fake).

**Props:**

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `modelValue` | `boolean` | No | `false` |
| `client` | `Object` | Yes | — |
| `currentState` | `string` | No | `''` |
| `estados` | `Array` | No | `[]` |

**Emits:** `update:modelValue`, `transitioned(result)`.

**Validation:**
- Target state is required
- Approved amount > 0 if provided
- `.cer`, `.key` files and password required for FIEL server-side

### PreviewTransitionPanel

Read-only panel that previews the impact of a transition before executing it.

**Props:**

| Prop | Type | Required | Default |
|------|------|----------|---------|
| `client` | `Object` | Yes | — |
| `targetState` | `string` | No | `''` |

Debounced by 300ms on `targetState` changes.

### MetadatosForm

Form generated from the backend metadata schema.

**Props:**

| Prop | Type | Required |
|------|------|----------|
| `client` | `Object` | Yes |

**Emits:** `saved(values)`.

### SlaStatusPanel

Panel to evaluate SLA status (admin only).

**Props:**

| Prop | Type | Required |
|------|------|----------|
| `client` | `Object` | Yes |

---

## Client API

```js
import { createSinpapelClient } from '@aprendomx/sinpapel-vue'

const client = createSinpapelClient({
  axios: myAxiosInstance,     // required
  basePath: '/sinpapel/api',  // default
  resource: 'solicitudes',    // required
  pk: 42,                     // can be changed later via client.pk = ...
})
```

**Methods:**

| Method | HTTP | Path | Returns |
|--------|------|------|---------|
| `availableTransitions()` | GET | `/{resource}/{pk}/available-transitions/` | `Estado[]` |
| `history({page, pageSize})` | GET | `/{resource}/{pk}/history/` | `HistoryResponse \| HistoryEntry[]` |
| `previewTransition(targetState)` | POST | `/{resource}/{pk}/preview-transition/` | `PreviewReport` |
| `getMetadatos()` | GET | `/{resource}/{pk}/metadatos/` | `{schema, values}` |
| `patchMetadatos(values)` | PATCH | `/{resource}/{pk}/metadatos/` | updated `values` |
| `slaStatus()` | POST | `/{resource}/{pk}/sla-status/` | `SlaAction[]` |
| `transition(payload)` | POST | `/{resource}/{pk}/transition/` | `TransitionResult` |

All calls support `AbortController` for cancellation. The store creates an `AbortController` per action and exposes `cancel()`.

---

## Composables

### useTransition(client)

Manages the state and logic of a transition.

```js
const tx = useTransition(client)
tx.targetState.value = 'APROBADA'
tx.comentarios.value = 'Approved by committee'
await tx.submit()  // validates, builds payload, sends, resets on success
```

**Returns:** `{ targetState, comentarios, montoAprobado, condiciones, signatureBackend, signatureMode, signatureFields, signaturePayload, loading, error, errors, buildPayload, submit, reset, validate }`

### useSpLabels()

Gets localized labels. Used automatically inside child components of `SeguimientoPanel`.

---

## Store

```js
import { useSeguimientoStore } from '@aprendomx/sinpapel-vue'

const store = useSeguimientoStore({ axios, resource: 'solicitudes', pk: 42 })
```

**Reactive state:**
- `estados`, `historial`, `historialCount`, `metadatos`, `preview`, `slaActions`
- `loading`: `{ estados: boolean, historial: boolean, metadatos: boolean, transicion: boolean }`
- `error`: last API error

**Actions:**
- `cargarEstados()`, `cargarHistorial(page?)`, `ejecutarTransicion(payload)`, `cargarMetadatos()`, `guardarMetadatos(values)`, `cargarPreview(targetState)`, `evaluarSla()`
- `cancel()`: aborts all in-flight requests

---

## Internationalization (i18n)

Supports `es` (Spanish) and `en` (English) with no external dependencies.

```vue
<SeguimientoPanel ... locale="en" />
```

To add a new language, create a file in `src/locales/` and register it in `useSpLabels.js`.

---

## TypeScript

Type definitions are in `types/index.d.ts` and resolve automatically:

```ts
import { createSinpapelClient, SeguimientoPanel, useTransition } from '@aprendomx/sinpapel-vue'
import type { SinpapelClient, TransitionPayload, Estado } from '@aprendomx/sinpapel-vue'
```

---

## Theming

CSS variables `--sp-*` can be overridden in your scope:

```css
:root {
  --sp-color-primary: #3a4a5c;
  --sp-surface: #ffffff;
  --sp-border: #dfe3e8;
  /* ...see src/styles/tokens.css */
}
```

---

## Features

- **Request cancellation** via `AbortController` on all axios calls
- **Automatic cleanup** on component unmount (`onUnmounted` + `cancel()`)
- **Debounce** of 300ms on transition preview
- **Granular loading** per action (states, history, metadata, transition)
- **Pagination** in history with Previous/Next controls
- **Form validation** in the transition dialog
- **Focus-trap and a11y** in dialogs (`role="dialog"`, `aria-modal`, `aria-live`)
- **Auto-reset** of forms after successful transition
- **State color** from API (`estado.color`)

---

## Known limitations

- `GET …/history/` returns thin django-simple-history records. It does not show comments, amounts or signatures unless the backend exposes them.
- No auto-discovery of `resource` slug; the consumer must pass it explicitly.

---

## Development

```bash
npm install
npm run dev       # development server (demo)
npm test          # full vitest suite
npm run test:watch # watch mode
npm run build     # library build → dist/
npm run lint      # eslint
```

---

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs lint, tests and build on Node 20 and 22 for every push and pull request to `main`/`master`.

---

## Publishing

```bash
npm publish
```

The `prepublishOnly` script ensures only code that passes lint + tests + build gets published.

---

## License

[GNU General Public License v3.0](LICENSE) © 2024-2026 AprendoMX

This software is free: you can redistribute it and/or modify it under the terms of the GNU GPL v3. There is no warranty of any kind.
