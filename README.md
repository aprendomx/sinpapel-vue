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
npm test         # vitest (run directly)
npm run build    # library build → dist/
```

**Quality gate (optional) — requires the `rai-frontend` CLI (Python, via pip, not npm):**

```bash
pip install "rai-frontend-gates @ git+ssh://git@github.com/aprendomx/rai-frontend-gates.git@v0.1.1"
npm run gate:baseline   # snapshot the current test baseline
npm run gate:tests      # the enforced gate (wraps vitest with delta-vs-baseline)
```
