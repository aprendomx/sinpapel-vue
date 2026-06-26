# Changelog

Todos los cambios notables de `@aprendomx/sinpapel-vue` se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

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
