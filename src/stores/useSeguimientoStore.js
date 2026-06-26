import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { createSinpapelClient } from '../client/sinpapelClient.js'

function isCancelError(e) {
  return e.name === 'AbortError' || e.name === 'CanceledError' || e.code === 'ERR_CANCELED'
}

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
    const documentos = ref([])
    const requisitos = ref([])
    const loading = reactive({
      estados: false, historial: false, metadatos: false, transicion: false,
      documentos: false, requisitos: false,
    })
    const error = ref(null)

    const inFlight = new Set()

    function cancel() {
      for (const ctrl of inFlight) {
        ctrl.abort()
      }
      inFlight.clear()
    }

    function makeClient() {
      const ctrl = new AbortController()
      inFlight.add(ctrl)
      return createSinpapelClient({ ...options, signal: ctrl.signal })
    }

    function cleanupClient(targetClient) {
      for (const ctrl of inFlight) {
        if (targetClient.signal === ctrl.signal) {
          inFlight.delete(ctrl)
          break
        }
      }
    }

    async function run(fn, key) {
      if (key) loading[key] = true
      error.value = null
      try {
        return await fn()
      } catch (e) {
        if (isCancelError(e)) {
          throw e
        }
        error.value = e.response?.data ?? { detail: e.message }
        throw e
      } finally {
        if (key) loading[key] = false
      }
    }

    async function cargarEstados() {
      return run(async () => {
        const c = makeClient()
        try {
          estados.value = await c.availableTransitions()
        } finally {
          cleanupClient(c)
        }
      }, 'estados')
    }
    async function cargarHistorial(page = 1) {
      return run(async () => {
        const c = makeClient()
        try {
          const data = await c.history({ page })
          historial.value = Array.isArray(data) ? data : (data.results ?? [])
          historialCount.value = Array.isArray(data) ? data.length : (data.count ?? historial.value.length)
        } finally {
          cleanupClient(c)
        }
      }, 'historial')
    }
    async function ejecutarTransicion(payload) {
      return run(async () => {
        const c = makeClient()
        try {
          const result = await c.transition(payload)
          await cargarEstados()
          await cargarHistorial()
          return result
        } finally {
          cleanupClient(c)
        }
      }, 'transicion')
    }
    async function cargarMetadatos() {
      return run(async () => {
        const c = makeClient()
        try {
          metadatos.value = await c.getMetadatos()
        } finally {
          cleanupClient(c)
        }
      }, 'metadatos')
    }
    async function guardarMetadatos(values) {
      return run(async () => {
        const c = makeClient()
        try {
          const updated = await c.patchMetadatos(values)
          metadatos.value = { ...metadatos.value, values: updated }
          return updated
        } finally {
          cleanupClient(c)
        }
      }, 'metadatos')
    }
    async function cargarPreview(targetState) {
      const c = makeClient()
      try {
        preview.value = await c.previewTransition(targetState)
        return preview.value
      } finally {
        cleanupClient(c)
      }
    }
    async function evaluarSla() {
      const c = makeClient()
      try {
        slaActions.value = await c.slaStatus()
        return slaActions.value
      } finally {
        cleanupClient(c)
      }
    }
    async function cargarRequisitos() {
      return run(async () => {
        const c = makeClient()
        try {
          requisitos.value = await c.requisitos()
        } finally {
          cleanupClient(c)
        }
      }, 'requisitos')
    }
    async function cargarDocumentos() {
      return run(async () => {
        const c = makeClient()
        try {
          documentos.value = await c.listDocumentos()
        } finally {
          cleanupClient(c)
        }
      }, 'documentos')
    }
    async function subirDocumento(payload) {
      return run(async () => {
        const c = makeClient()
        try {
          const created = await c.uploadDocumento(payload)
          await cargarDocumentos()
          await cargarRequisitos()
          return created
        } finally {
          cleanupClient(c)
        }
      }, 'documentos')
    }
    async function eliminarDocumento(docId) {
      return run(async () => {
        const c = makeClient()
        try {
          await c.deleteDocumento(docId)
          await cargarDocumentos()
          await cargarRequisitos()
        } finally {
          cleanupClient(c)
        }
      }, 'documentos')
    }

    return {
      client, estados, historial, historialCount, metadatos, preview, slaActions,
      documentos, requisitos,
      loading, error,
      cancel,
      cargarEstados, cargarHistorial, ejecutarTransicion,
      cargarMetadatos, guardarMetadatos, cargarPreview, evaluarSla,
      cargarRequisitos, cargarDocumentos, subirDocumento, eliminarDocumento,
    }
  })
  return define()
}
