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
