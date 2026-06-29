# Changelog

Todos los cambios notables de `@aprendomx/sinpapel-vue` se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.3.0] - 2026-06-29

### Changed

- `DocumentosPanel`: el formulario de carga ahora usa **selects** en vez de
  inputs numéricos crudos. El **tipo de documento** se puebla desde
  `requisitos()` (solo los tipos que el estado actual exige) y el
  **documento** es un select **dependiente** del tipo (ej. "Identificación" →
  "Pasaporte" / "INE"), poblado desde el nuevo campo `documentos_disponibles`.
  Si un tipo tiene una sola opción, se autoselecciona. Se **eliminó** el input
  de **porcentaje**: lo determina la configuración del requisito
  (`RequisitoEstadoDocumento.porcentaje`) y la carga usa el default del
  backend. Cuando el estado no exige documentos se muestra un aviso y se oculta
  el formulario. Requiere `sinpapel-drf >= 0.4.0`.

### Added

- Tipos `RequisitoStatus.tipo_documento_id`, `RequisitoStatus.documentos_disponibles`
  y `DocumentoOpcion` (`{ id, nombre }`), reflejando el contrato enriquecido de
  `GET /requisitos/` en `sinpapel-drf` 0.4.0.

### Removed

- **BREAKING:** Eliminado el campo `monto_aprobado` / `montoAprobado`, que
  fue removido de `sinpapel` por ser residual. Afecta el payload de
  transición (`buildPayload`/`buildTransitionRequest` ya no lo emiten), el
  formulario de `TransitionDialog`, el composable `useTransition` (ref,
  validación y `reset`), las etiquetas i18n (`es`/`en`) y los tipos
  TypeScript (`TransitionPayload`, `UseTransitionReturn`).
- Inputs numéricos de **documento (ID)**, **tipo de documento (ID)** y
  **porcentaje** del `DocumentosPanel`, junto con sus etiquetas i18n
  (`documentoId`, `tipoDocumentoId`, `porcentaje`, `documentoOTipoHint`,
  `opcional`) — reemplazados por los selects descritos arriba.

## [0.2.0] - 2026-06-26

### Added

- Soporte de archivos contra los endpoints de documentos de
  `sinpapel-drf` v0.3.0 (`sinpapel` v0.6.0):
  - Cliente: `listDocumentos()`, `uploadDocumento(payload)` (multipart),
    `deleteDocumento(id)` y `requisitos()`. Helper exportado
    `buildDocumentoUpload(payload)` que codifica el `FormData` (incluye
    `metadatos` como JSON).
  - Store: estado `documentos` / `requisitos`, loading granular
    (`loading.documentos`, `loading.requisitos`) y acciones
    `cargarDocumentos()`, `cargarRequisitos()`, `subirDocumento(payload)`,
    `eliminarDocumento(id)` (estas dos refrescan lista + requisitos).
  - Componentes nuevos `RequisitosPanel` (checklist de cumplimiento del
    estado, read-only) y `DocumentosPanel` (lista + carga + borrado, emite
    `changed`), exportados e integrados como pestañas **Requisitos** y
    **Documentos** en `SeguimientoPanel`.
  - Etiquetas i18n (`es`/`en`) y tipos TypeScript para los nuevos métodos,
    estado, acciones, componentes y las formas `InstanciaDocumento`,
    `RequisitoStatus` y `DocumentoUploadPayload`.
