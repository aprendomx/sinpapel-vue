# @aprendomx/sinpapel-vue

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Biblioteca de componentes Vue 3 para el seguimiento de flujos de trabajo (workflow tracking) consumiendo la API REST de [`sinpapel-drf`](https://github.com/aprendomx/sinpapel-drf). Generalizada a partir del UI de flujos del proyecto `creditos`.

---

## Tabla de contenidos

- [Instalacion](#instalacion)
- [Uso rapido](#uso-rapido)
- [Componentes](#componentes)
- [API del cliente](#api-del-cliente)
- [Composables](#composables)
- [Store](#store)
- [Internacionalizacion (i18n)](#internacionalizacion-i18n)
- [TypeScript](#typescript)
- [Tematizacion](#tematizacion)
- [Caracteristicas](#caracteristicas)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Desarrollo](#desarrollo)
- [CI/CD](#cicd)
- [Publicacion](#publicacion)
- [Licencia](#licencia)

---

## Instalacion

```bash
npm install @aprendomx/sinpapel-vue
# peer dependencies requeridas:
npm install vue pinia quasar
```

> **Nota:** Quasar es una **peer dependency obligatoria**. Los widgets reutilizan componentes `q-*` (como `q-dialog`, `q-icon`, etc.).

---

## Uso rapido

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

El prop `resource` debe ser el `effective_slug` del modelo decorado con `@workflow_enabled`. No hay auto-descubrimiento en v1.

> **Importante:** `SeguimientoPanel` crea su store a partir de las props iniciales. Si `pk` o `resource` cambian dinamicamente, pasa `:key="pk"` para forzar un remount.

---

## Componentes

### SeguimientoPanel

Widget compuesto principal. Renderiza el badge de estado actual, pestanas (Historial / Previsualizar / Metadatos / SLA) y el dialogo de transicion.

**Props:**

| Prop | Tipo | Requerido | Default | Descripcion |
|------|------|-----------|---------|-------------|
| `axios` | `Object` | Si | — | Instancia de axios (auth, baseURL, interceptors) |
| `basePath` | `string` | No | `/sinpapel/api` | Path base donde esta montada la API |
| `resource` | `string` | Si | — | Slug del recurso (effective_slug) |
| `pk` | `number \| string` | Si | — | ID de la instancia |
| `currentState` | `string` | No | `''` | Estado actual para mostrar en el badge |
| `canEvaluateSla` | `boolean` | No | `false` | Muestra la pestana SLA |
| `locale` | `string` | No | `'es'` | Idioma (`es` o `en`) |

**Emits:** ninguno (todo se maneja internamente via el store).

### StateBadge

Pildora de estado con punto de color.

**Props:**

| Prop | Tipo | Requerido | Default |
|------|------|-----------|---------|
| `estado` | `string` | Si | — |
| `color` | `string` | No | `''` |
| `label` | `string` | No | `''` |

La etiqueta por defecto humaniza el nombre del estado (`EN_REVISION` → `EN REVISION`). Si se pasa `color`, se usa `color-mix` para el fondo.

### HistoryTimeline

Linea temporal vertical sobre entradas de historial.

**Props:**

| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `entries` | `Array` | `[]` | Filas de historial |
| `page` | `number` | `1` | Pagina actual |
| `pageSize` | `number` | `0` | Tamano de pagina (0 = sin paginacion) |
| `count` | `number` | `0` | Total de registros |

**Emits:** `prev`, `next`.

### TransitionDialog

Dialogo modal para ejecutar una transicion de estado. Incluye selector de estado destino, comentarios, monto aprobado, condiciones y firma polimorfica (FIEL client-side/server-side, manual, fake).

**Props:**

| Prop | Tipo | Requerido | Default |
|------|------|-----------|---------|
| `modelValue` | `boolean` | No | `false` |
| `client` | `Object` | Si | — |
| `currentState` | `string` | No | `''` |
| `estados` | `Array` | No | `[]` |

**Emits:** `update:modelValue`, `transitioned(result)`.

**Validacion:**
- Estado destino obligatorio
- Monto aprobado > 0 si se proporciona
- Archivos `.cer`, `.key` y contrasena obligatorios para FIEL server-side

### PreviewTransitionPanel

Panel de solo lectura que previsualiza el impacto de una transicion antes de ejecutarla.

**Props:**

| Prop | Tipo | Requerido | Default |
|------|------|-----------|---------|
| `client` | `Object` | Si | — |
| `targetState` | `string` | No | `''` |

Con debounce de 300ms sobre cambios de `targetState`.

### MetadatosForm

Formulario generado a partir del schema de metadatos del backend.

**Props:**

| Prop | Tipo | Requerido |
|------|------|-----------|
| `client` | `Object` | Si |

**Emits:** `saved(values)`.

### SlaStatusPanel

Panel para evaluar el estado de SLAs (admin only).

**Props:**

| Prop | Tipo | Requerido |
|------|------|-----------|
| `client` | `Object` | Si |

### RequisitosPanel

Checklist de cumplimiento documental del estado actual (read-only). Consume
`GET …/requisitos/`.

**Props:**

| Prop | Tipo | Requerido |
|------|------|-----------|
| `client` | `Object` | Si |

### DocumentosPanel

Lista, carga (multipart) y borra documentos del tramite. Consume
`GET/POST …/documentos/` y `DELETE …/documentos/{id}/`. En el formulario de
carga indica el **ID de Documento** o el **ID de Tipo de documento** (uno de
los dos) mas el archivo.

**Props:**

| Prop | Tipo | Requerido |
|------|------|-----------|
| `client` | `Object` | Si |

**Emits:** `changed` (tras subir o borrar).

---

## API del cliente

```js
import { createSinpapelClient } from '@aprendomx/sinpapel-vue'

const client = createSinpapelClient({
  axios: myAxiosInstance,     // requerido
  basePath: '/sinpapel/api',  // default
  resource: 'solicitudes',    // requerido
  pk: 42,                     // puede cambiarse despues via client.pk = ...
})
```

**Metodos:**

| Metodo | HTTP | Ruta | Retorna |
|--------|------|------|---------|
| `availableTransitions()` | GET | `/{resource}/{pk}/available-transitions/` | `Estado[]` |
| `history({page, pageSize})` | GET | `/{resource}/{pk}/history/` | `HistoryResponse \| HistoryEntry[]` |
| `previewTransition(targetState)` | POST | `/{resource}/{pk}/preview-transition/` | `PreviewReport` |
| `getMetadatos()` | GET | `/{resource}/{pk}/metadatos/` | `{schema, values}` |
| `patchMetadatos(values)` | PATCH | `/{resource}/{pk}/metadatos/` | `values` actualizados |
| `slaStatus()` | POST | `/{resource}/{pk}/sla-status/` | `SlaAction[]` |
| `transition(payload)` | POST | `/{resource}/{pk}/transition/` | `TransitionResult` |
| `requisitos()` | GET | `/{resource}/{pk}/requisitos/` | `RequisitoStatus[]` |
| `listDocumentos()` | GET | `/{resource}/{pk}/documentos/` | `InstanciaDocumento[]` |
| `uploadDocumento(payload)` | POST | `/{resource}/{pk}/documentos/` | `InstanciaDocumento` |
| `deleteDocumento(id)` | DELETE | `/{resource}/{pk}/documentos/{id}/` | — |

`uploadDocumento({ archivo, documento?, tipo_documento?, porcentaje?, metadatos? })` se envia como `multipart/form-data`; debe incluir `documento` **o** `tipo_documento`. El helper `buildDocumentoUpload(payload)` arma el `FormData` (codifica `metadatos` como JSON).

Todas las llamadas soportan `AbortController` para cancelacion. El store crea un `AbortController` por accion y expone `cancel()`.

---

## Composables

### useTransition(client)

Maneja el estado y la logica de una transicion.

```js
const tx = useTransition(client)
tx.targetState.value = 'APROBADA'
tx.comentarios.value = 'Aprobado por comite'
await tx.submit()  // valida, construye payload, envia, resetea en exito
```

**Retorna:** `{ targetState, comentarios, montoAprobado, condiciones, signatureBackend, signatureMode, signatureFields, signaturePayload, loading, error, errors, buildPayload, submit, reset, validate }`

### useSpLabels()

Obtiene las etiquetas localizadas. Se usa automaticamente dentro de los componentes hijos de `SeguimientoPanel`.

---

## Store

```js
import { useSeguimientoStore } from '@aprendomx/sinpapel-vue'

const store = useSeguimientoStore({ axios, resource: 'solicitudes', pk: 42 })
```

**Estado reactivo:**
- `estados`, `historial`, `historialCount`, `metadatos`, `preview`, `slaActions`, `documentos`, `requisitos`
- `loading`: `{ estados, historial, metadatos, transicion, documentos, requisitos }` (booleanos)
- `error`: ultimo error de la API

**Acciones:**
- `cargarEstados()`, `cargarHistorial(page?)`, `ejecutarTransicion(payload)`, `cargarMetadatos()`, `guardarMetadatos(values)`, `cargarPreview(targetState)`, `evaluarSla()`
- `cargarRequisitos()`, `cargarDocumentos()`, `subirDocumento(payload)`, `eliminarDocumento(id)` (las dos ultimas refrescan lista + requisitos)
- `cancel()`: aborta todas las requests en vuelo

---

## Internacionalizacion (i18n)

Soporta `es` (espanol) y `en` (ingles) sin dependencias externas.

```vue
<SeguimientoPanel ... locale="en" />
```

Para agregar un nuevo idioma, crea un archivo en `src/locales/` y registralo en `useSpLabels.js`.

---

## TypeScript

Las definiciones de tipos estan en `types/index.d.ts` y se resuelven automaticamente:

```ts
import { createSinpapelClient, SeguimientoPanel, useTransition } from '@aprendomx/sinpapel-vue'
import type { SinpapelClient, TransitionPayload, Estado } from '@aprendomx/sinpapel-vue'
```

---

## Tematizacion

Las variables CSS `--sp-*` se pueden sobreescribir en tu scope:

```css
:root {
  --sp-color-primary: #3a4a5c;
  --sp-surface: #ffffff;
  --sp-border: #dfe3e8;
  /* ...ver src/styles/tokens.css */
}
```

---

## Caracteristicas

- **Cancelacion de requests** via `AbortController` en todas las llamadas axios
- **Cleanup automatico** al desmontar componentes (`onUnmounted` + `cancel()`)
- **Debounce** de 300ms en previsualizacion de transiciones
- **Loading granular** por accion (estados, historial, metadatos, transicion)
- **Paginacion** en historial con controles Anterior/Siguiente
- **Validacion de formularios** en dialogo de transicion
- **Focus-trap y a11y** en dialogos (`role="dialog"`, `aria-modal`, `aria-live`)
- **Reset automatico** de formularios tras transicion exitosa
- **Color de estado** desde la API (`estado.color`)

---

## Limitaciones conocidas

- `GET …/history/` retorna registros delgados de django-simple-history. No muestra comentarios, montos ni firmas a menos que el backend los exponga.
- No hay auto-descubrimiento de `resource` slug; el consumidor debe pasarlo explicitamente.

---

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo (demo)
npm test          # suite completa de vitest
npm run test:watch # modo watch
npm run build     # build de libreria → dist/
npm run lint      # eslint
```

---

## CI/CD

El proyecto incluye un workflow de GitHub Actions (`.github/workflows/ci.yml`) que ejecuta lint, tests y build en Node 20 y 22 para cada push y pull request a `main`/`master`.

---

## Publicacion

```bash
npm publish
```

El script `prepublishOnly` garantiza que solo se publica codigo que pasa lint + tests + build.

---

## Licencia

[GNU General Public License v3.0](LICENSE) © 2024-2026 AprendoMX

Este software es libre: puedes redistribuirlo y/o modificarlo bajo los terminos de la GNU GPL v3. No hay garantia de ningun tipo.
