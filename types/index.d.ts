import type { Ref, ComputedRef, Reactive } from 'vue'
import type { Store } from 'pinia'

// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------

export interface SinpapelClientOptions {
  axios: {
    get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>
    post: (url: string, body?: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>
    patch: (url: string, body?: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>
    delete: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>
  }
  basePath?: string
  resource: string
  pk?: number | string | null
  signal?: AbortSignal
}

export interface SinpapelClient {
  axios: SinpapelClientOptions['axios']
  resource: string
  pk: number | string | null
  signal?: AbortSignal
  availableTransitions: () => Promise<Estado[]>
  history: (opts?: { page?: number; pageSize?: number }) => Promise<HistoryResponse | HistoryEntry[]>
  previewTransition: (targetState: string, opts?: { signal?: AbortSignal }) => Promise<PreviewReport>
  getMetadatos: () => Promise<MetadatosResponse>
  patchMetadatos: (values: Record<string, unknown>) => Promise<Record<string, unknown>>
  slaStatus: () => Promise<SlaAction[]>
  transition: (payload: TransitionPayload) => Promise<TransitionResult>
  listDocumentos: () => Promise<InstanciaDocumento[]>
  uploadDocumento: (payload: DocumentoUploadPayload) => Promise<InstanciaDocumento>
  deleteDocumento: (docId: number | string) => Promise<unknown>
  requisitos: () => Promise<RequisitoStatus[]>
}

export function createSinpapelClient(options: SinpapelClientOptions): SinpapelClient

export interface TransitionRequest {
  body: FormData | TransitionPayload
  config: Record<string, unknown>
}

export function buildTransitionRequest(payload: TransitionPayload): TransitionRequest

export interface DocumentoUploadPayload {
  archivo: File | Blob
  documento?: number | null
  tipo_documento?: number | null
  porcentaje?: number
  metadatos?: Record<string, unknown>
}

export interface DocumentoUploadRequest {
  body: FormData
  config: Record<string, unknown>
}

export function buildDocumentoUpload(payload: DocumentoUploadPayload): DocumentoUploadRequest

// ------------------------------------------------------------------
// Payloads & Responses
// ------------------------------------------------------------------

export interface SignaturePayload {
  backend: 'fiel' | 'manual' | 'fake'
  mode?: 'client-side' | 'server-side'
  firma_b64?: string
  certificado_cer_b64?: string
  cer_file?: File | Blob | null
  key_file?: File | Blob | null
  password?: string
  scanned_image_path?: string
  witness_name?: string
}

export interface TransitionPayload {
  target_state: string | null
  comentarios?: string
  monto_aprobado?: number | null
  condiciones?: string
  signature?: SignaturePayload
}

export interface TransitionResult {
  success: boolean
  instance_id?: number
  estado_anterior?: string
  estado_nuevo?: string
  seguimiento_id?: number
}

export interface Estado {
  id?: number
  nombre: string
  color?: string
}

export interface HistoryEntry {
  history_id?: number
  history_type: '+' | '~' | '-'
  history_date?: string
  history_user?: string | null
  history_change_reason?: string | null
}

export interface HistoryResponse {
  count: number
  next?: string | null
  previous?: string | null
  results: HistoryEntry[]
}

export interface CampoMetadato {
  nombre: string
  tipo: 'str' | 'int' | 'Decimal' | 'bool' | 'date'
  requerido: boolean
  default: unknown
  choices: string[] | null
  etiqueta?: string
  ayuda?: string
}

export interface MetadatosResponse {
  schema: CampoMetadato[]
  values: Record<string, unknown>
}

export interface PreviewReport {
  permitido: boolean
  razones_bloqueo?: unknown[]
  documentos_faltantes?: unknown[]
  predicados_fallidos?: unknown[]
  aprobadores_requeridos?: unknown[]
  side_effects?: unknown[]
  historial_reciente?: unknown[]
}

export interface SlaAction {
  accion?: string
  action?: string
  estado?: string
}

export interface InstanciaDocumento {
  id: number
  documento: number | null
  tipo_documento?: string | null
  archivo?: string | null
  porcentaje: number
  creado?: string | null
}

export interface RequisitoStatus {
  nivel: string
  tipo_documento?: string | null
  porcentaje_requerido?: number | null
  porcentaje_actual?: number | null
  satisfecho: boolean
  auto_carga?: boolean
  mensaje?: string
}

// ------------------------------------------------------------------
// Composables
// ------------------------------------------------------------------

export interface UseTransitionReturn {
  targetState: Ref<string | null>
  comentarios: Ref<string>
  montoAprobado: Ref<number | null>
  condiciones: Ref<string>
  signatureBackend: Ref<'fiel' | 'manual' | 'fake' | null>
  signatureMode: Ref<'client-side' | 'server-side'>
  signatureFields: Reactive<{
    firma_b64: string
    certificado_cer_b64: string
    cer_file: File | Blob | null
    key_file: File | Blob | null
    password: string
    scanned_image_path: string
    witness_name: string
  }>
  signaturePayload: ComputedRef<SignaturePayload | null>
  loading: Ref<boolean>
  error: Ref<unknown>
  errors: Reactive<Record<string, string>>
  buildPayload: () => TransitionPayload
  submit: () => Promise<TransitionResult | undefined>
  reset: () => void
  validate: () => boolean
}

export function useTransition(client: SinpapelClient): UseTransitionReturn

export function buildSignaturePayload(
  backend: string | null,
  mode: string,
  fields: Record<string, unknown>,
): SignaturePayload | null

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------

export interface SeguimientoStoreState {
  client: SinpapelClient
  estados: Estado[]
  historial: HistoryEntry[]
  historialCount: number
  metadatos: MetadatosResponse
  preview: PreviewReport | null
  slaActions: SlaAction[]
  documentos: InstanciaDocumento[]
  requisitos: RequisitoStatus[]
  loading: {
    estados: boolean; historial: boolean; metadatos: boolean; transicion: boolean
    documentos: boolean; requisitos: boolean
  }
  error: unknown
}

export interface SeguimientoStoreActions {
  cancel: () => void
  cargarEstados: () => Promise<void>
  cargarHistorial: (page?: number) => Promise<void>
  ejecutarTransicion: (payload: TransitionPayload) => Promise<TransitionResult>
  cargarMetadatos: () => Promise<void>
  guardarMetadatos: (values: Record<string, unknown>) => Promise<Record<string, unknown>>
  cargarPreview: (targetState: string) => Promise<PreviewReport>
  evaluarSla: () => Promise<SlaAction[]>
  cargarRequisitos: () => Promise<void>
  cargarDocumentos: () => Promise<void>
  subirDocumento: (payload: DocumentoUploadPayload) => Promise<InstanciaDocumento>
  eliminarDocumento: (docId: number | string) => Promise<void>
}

export type SeguimientoStore = Store<string, SeguimientoStoreState, {}, SeguimientoStoreActions>

export function useSeguimientoStore(options: SinpapelClientOptions): SeguimientoStore

// ------------------------------------------------------------------
// Components
// ------------------------------------------------------------------

import type { DefineComponent } from 'vue'

export const StateBadge: DefineComponent<{
  estado: string
  color?: string
  label?: string
}>

export const HistoryTimeline: DefineComponent<{
  entries?: HistoryEntry[]
  page?: number
  pageSize?: number
  count?: number
}, {}, { prev: []; next: [] }>

export const TransitionDialog: DefineComponent<{
  modelValue?: boolean
  client: SinpapelClient
  currentState?: string
  estados?: Estado[]
}, {}, { 'update:modelValue': [boolean]; transitioned: [TransitionResult] }>

export const PreviewTransitionPanel: DefineComponent<{
  client: SinpapelClient
  targetState?: string
}>

export const MetadatosForm: DefineComponent<{
  client: SinpapelClient
}, {}, { saved: [Record<string, unknown>] }>

export const SlaStatusPanel: DefineComponent<{
  client: SinpapelClient
}>

export const RequisitosPanel: DefineComponent<{
  client: SinpapelClient
}>

export const DocumentosPanel: DefineComponent<{
  client: SinpapelClient
}, {}, { changed: [] }>

export const SeguimientoPanel: DefineComponent<{
  axios: SinpapelClientOptions['axios']
  basePath?: string
  resource: string
  pk: number | string
  currentState?: string
  canEvaluateSla?: boolean
}>
