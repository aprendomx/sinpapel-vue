# sinpapel-vue — Seguimiento widget library

**Date:** 2026-06-20
**Status:** Approved (design)
**Author:** Julio Adrián (with Rai)

## 1. Purpose

`sinpapel-vue` is a Vue 3 component library that provides reusable **seguimiento**
(workflow-tracking) UI widgets for any front-end that consumes the
[`sinpapel-drf`](../../../../sinpapel-drf) REST API. It generalizes the
workflow-tracking pages and widgets already proven in the `creditos` front-end
(`frontend/src/pages/workflow/*` + `frontend/src/components/workflow/*`),
stripping their creditos-specific coupling and rewiring them to the **generic**
sinpapel-drf endpoint contracts.

The result ships as:

- a **publishable npm package** (`@aprendomx/sinpapel-vue`, Vite library mode), and
- a **runnable demo app** that mounts the widgets against a configurable
  sinpapel-drf backend, used for development and manual verification.

### Non-goals (v1)

- No backend code. This is a pure front-end consumer of `sinpapel-drf`.
- No admin CRUD for `condiciones` / `slas`, and no `flujos` export/import UI.
  Those are a separate, larger surface (candidate for a later iteration).
- No creditos domain concepts: lotes/checklist, CURP validation, CSF,
  verificación de ingresos, expediente upload, folio/persona/dirección panels.
- No design-system lock-in. The default theme is neutral; gov palettes are a
  consumer override, not baked in.

## 2. Background — what is ported and what is dropped

The creditos source is real and battle-tested, but it is coupled to the creditos
domain and hits **creditos-custom** endpoints (`/workflow/cambiar-estado/`,
`/seguimientos/`, `/solicitudes/...`), **not** the generic sinpapel-drf API. The
table below maps each source artifact to its generic target.

| creditos source | sinpapel-vue target | Change |
|---|---|---|
| `components/workflow/BadgeEstado.vue` | `components/StateBadge.vue` | Drop hardcoded creditos palette/labels; drive color from `EstadoSerializer.color` + CSS-var fallback; optional consumer label map. |
| `components/workflow/TimelineSeguimiento.vue` | `components/HistoryTimeline.vue` | Rewire to `HistoryEntrySerializer` shape; degrade gracefully on extra fields. |
| `components/workflow/DialogoCambioEstado.vue` | `components/TransitionDialog.vue` | Replace FIEL-only client-side flow with the **full polymorphic** `SignatureRequestSerializer` (fiel client/server · manual · fake); options from `available-transitions`, not a hardcoded permissions composable. |
| `services/workflowService.js` | `client/sinpapelClient.js` | Reduce to the generic sinpapel-drf surface; inject axios instead of importing `src/boot/axios`. |
| `stores/workflow.js` | `stores/useSeguimientoStore.js` | Generic per-`(resource, pk)` store; drop lotes/CURP/docs actions. |
| `pages/workflow/SeguimientoSolicitudPage.vue` | `components/SeguimientoPanel.vue` + demo `App.vue` | Keep the badge + tabs + dialog composition; drop firma-contrato/verificación/CSF tabs and the persona/dirección sidebar. |
| `EstadisticasWorkflow.vue`, `LoteRevisionPage.vue`, `SolicitudesPendientesPage.vue`, `ValidacionCurpPage.vue`, `useWorkflowPermissions.js` | — | Dropped: creditos-specific, no generic equivalent in sinpapel-drf. |

### History shape gap (explicitly accepted)

The generic `GET …/history/` endpoint returns thin **django-simple-history**
records (`history_id`, `history_type`, `history_date`, `history_user`,
`history_change_reason`) — see `sinpapel_drf.serializers.HistoryEntrySerializer`.
This is poorer than creditos' rich `/seguimientos/` (which carries `comentarios`,
`monto_aprobado`, `condiciones`, `firma_registro`, `expedientes`). `HistoryTimeline`
renders the thin shape and only shows the richer rows **if** the consumer's
backend happens to expose them. This is the honest generic contract.

## 3. Architecture

### 3.1 Repository layout

```
sinpapel-vue/
├── package.json            # @aprendomx/sinpapel-vue; exports dist + style.css
├── vite.config.js          # library mode (build.lib) + demo dev server
├── vitest.config.js
├── eslint.config.js        # eslint + eslint-plugin-vue (matches creditos/frontend)
├── jsconfig.json
├── .rai-frontend/          # rai-frontend-gates baseline + config (created by snapshot)
├── src/                    # ← publishable library
│   ├── index.js            # public entry: re-export widgets, composables, client, store
│   ├── client/
│   │   └── sinpapelClient.js
│   ├── stores/
│   │   └── useSeguimientoStore.js
│   ├── composables/
│   │   └── useTransition.js
│   ├── components/
│   │   ├── StateBadge.vue
│   │   ├── HistoryTimeline.vue
│   │   ├── TransitionDialog.vue
│   │   ├── PreviewTransitionPanel.vue
│   │   ├── MetadatosForm.vue
│   │   ├── SlaStatusPanel.vue
│   │   └── SeguimientoPanel.vue
│   └── styles/
│       └── tokens.css      # --sp-* CSS variables (neutral default theme)
├── demo/                   # ← runnable app (not published)
│   ├── index.html
│   ├── main.js             # Quasar + Pinia bootstrap, axios instance
│   └── App.vue             # config form (basePath, resource, pk) → <SeguimientoPanel>
├── tests/                  # vitest unit tests
└── README.md
```

### 3.2 The API client — the contract boundary

`createSinpapelClient(options)` is the single seam between the widgets and the
network. It takes an **injected axios instance** so the consumer owns auth,
`baseURL`, and interceptors (no `src/boot/axios` coupling).

```js
// createSinpapelClient({ axios, basePath, resource, pk }) → client
const client = createSinpapelClient({
  axios: myAxiosInstance,      // required: consumer-owned instance
  basePath: '/sinpapel/api',   // default; where sinpapel_drf.urls is mounted
  resource: 'solicitudes',     // the WorkflowConfig.effective_slug
  pk: 42,                      // instance id (may be set later via client.pk = …)
})
```

Methods map 1:1 to the sinpapel-drf surface that exists today:

| Method | HTTP | Path (under `basePath`) | Returns |
|---|---|---|---|
| `availableTransitions()` | GET | `/{resource}/{pk}/available-transitions/` | `[{id, nombre, color}]` |
| `transition(payload)` | POST | `/{resource}/{pk}/transition/` | `{success, instance_id, estado_anterior, estado_nuevo, seguimiento_id}` |
| `previewTransition(targetState)` | POST | `/{resource}/{pk}/preview-transition/` | preview report (see §3.3) |
| `history({ page, pageSize })` | GET | `/{resource}/{pk}/history/` | `{count, next, previous, results}` |
| `getMetadatos()` | GET | `/{resource}/{pk}/metadatos/` | `{schema, values}` |
| `patchMetadatos(values)` | PATCH | `/{resource}/{pk}/metadatos/` | updated `values` |
| `slaStatus()` | POST | `/{resource}/{pk}/sla-status/` | `[actions]` (admin only) |

`transition(payload)` chooses encoding from the `signature` block:

- No signature, or `fiel`/client-side, or `manual`/`fake` → **JSON** body.
- `fiel` + `server-side` → **multipart/form-data** (`cer_file`, `key_file`,
  `password`) exactly as `_build_firma_payload_for_engine` expects.

Error mapping is passed through from sinpapel-drf untouched: `400` →
`ValidationError` body, `403` → `PermissionDenied`. The client surfaces
`error.response.data` so widgets can render field errors.

### 3.3 Signature dispatch — `useTransition` composable

The highest-risk logic. `useTransition(client)` exposes reactive state and a
`submit()` that builds the correct `signature` block for the chosen backend,
mirroring `SignatureRequestSerializer`:

| backend | mode | body | fields |
|---|---|---|---|
| `fiel` | `client-side` | JSON | `firma_b64`, `certificado_cer_b64` |
| `fiel` | `server-side` | multipart | `cer_file`, `key_file`, `password` (gated by backend `SINPAPEL_ALLOW_SERVER_SIGNING`) |
| `manual` | — | JSON | `scanned_image_path`, `witness_name` |
| `fake` | — | JSON | (none) |
| (none) | — | JSON | unsigned transition |

Plus the always-available transition kwargs: `target_state` (required),
`comentarios`, `monto_aprobado`, `condiciones`.

### 3.4 Store — `useSeguimientoStore`

A Pinia store **factory** keyed by `(resource, pk)` holding:
`estados` (available transitions), `historial`, `metadatos`, `preview`,
`slaActions`, plus `loading` / `error`. Actions wrap the client and refresh
`availableTransitions` + `history` after a successful `transition` (the source
store's invalidate-after-change pattern, generalized).

### 3.5 Components

- **StateBadge** — `props: { estado, color?, label? }`. Renders a pill; color
  precedence: explicit `color` prop → API `color` → `--sp-*` token fallback.
- **HistoryTimeline** — `props: { entries }`. Vertical timeline over
  `HistoryEntrySerializer` rows; empty state; graceful extra-field rendering.
- **TransitionDialog** — `props: { client, currentState }`,
  `emits: ['transitioned', 'update:modelValue']`. Target select from
  `availableTransitions`; comentarios/monto/condiciones; collapsible signature
  section driven by `useTransition`. No creditos expediente upload.
- **PreviewTransitionPanel** — `props: { client, targetState }`. Renders the
  preview report: `permitido`, `razones_bloqueo`, `documentos_faltantes`,
  `predicados_fallidos`, `aprobadores_requeridos`, `side_effects`,
  `historial_reciente`. Read-only; no mutation.
- **MetadatosForm** — `props: { client }`. Builds a form from the `schema`
  (`CampoMetadato`: nombre, tipo, requerido, default, choices, etiqueta, ayuda),
  binds `values`, PATCHes on submit, surfaces field errors.
- **SlaStatusPanel** — `props: { client }`. Button → `slaStatus()`; lists
  returned actions or an "up to date / not applicable" empty state. Admin-only;
  hidden via a `canEvaluateSla` prop the consumer sets.
- **SeguimientoPanel** — composed orchestrator: `props: { axios, basePath,
  resource, pk, canEvaluateSla? }`. Creates the client + store, renders the
  StateBadge header, a "Cambiar estado" button → TransitionDialog, and tabs
  (Historial / Preview / Metadatos / SLA). This is the drop-in widget; the demo
  `App.vue` is a thin config shell around it.

### 3.6 Theming

`src/styles/tokens.css` defines neutral defaults:
`--sp-color-primary`, `--sp-color-on-primary`, `--sp-surface`, `--sp-border`,
`--sp-text`, `--sp-text-muted`, `--sp-radius`, `--sp-badge-bg`, `--sp-badge-text`.
Consumers re-skin by overriding the variables in their own scope. Widget styles
are scoped and reference only tokens (no hardcoded guinda hex like the source).

## 4. Tooling

- **Build:** Vite library mode (`build.lib`) emits ESM + a `style.css`; `vue`,
  `quasar`, and `pinia` are externalized peer deps.
- **Tests:** Vitest + `@vue/test-utils`. Priority units: `sinpapelClient`
  (mock axios, assert paths/bodies/encoding) and `useTransition` (signature
  block shaping per backend×mode). This is the **enforced gate**.
- **rai-frontend-gates:** full integration (dev dep), `rai-frontend gate check
  tests` is the gate that must pass; `baseline snapshot` recorded. `lint` and
  `build` exist as npm scripts and may be snapshotted, but per scope decision the
  blocking gate is `tests`.
- **Lint:** `eslint` + `eslint-plugin-vue`, config mirrored from
  `creditos/frontend/eslint.config.js`.

## 5. Testing strategy

| Unit | What it verifies |
|---|---|
| `sinpapelClient.availableTransitions/history/...` | correct URL, method, query params against a mocked axios |
| `sinpapelClient.transition` | JSON vs multipart selection; payload shape |
| `useTransition` | signature block per backend×mode matches `SignatureRequestSerializer` |
| `StateBadge` | color precedence (prop → api → token) |
| `HistoryTimeline` | renders thin shape; empty state |
| `MetadatosForm` | schema→fields; PATCH payload; field-error surfacing |

Manual verification: the demo app, pointed at a live `sinpapel-drf` (or optional
MSW handlers replaying the documented response shapes).

## 6. Risks & mitigations

- **History gap (§2):** accepted; documented in README so consumers aren't
  surprised by thin timelines.
- **Server-side signing:** multipart path is gated server-side by
  `SINPAPEL_ALLOW_SERVER_SIGNING`; the widget shows the option but the backend
  rejects it with a clear 400 when disabled — surfaced as a field error.
- **Quasar peer dep:** consumers must run Quasar. Documented as a hard peer
  requirement; the demo bootstraps it.
- **Resource slug discovery:** the client requires the consumer to pass the
  `effective_slug`. v1 does not auto-discover; documented in README.

## 7. Open questions

None blocking. Auto-discovery of resource slugs and admin CRUD widgets are
deferred to a future iteration.
