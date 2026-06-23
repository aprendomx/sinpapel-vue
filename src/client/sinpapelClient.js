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

export function createSinpapelClient({ axios, basePath = '/sinpapel/api', resource, pk = null, signal } = {}) {
  if (!axios) throw new Error('createSinpapelClient: `axios` instance is required')
  if (!resource) throw new Error('createSinpapelClient: `resource` slug is required')

  const base = () => `${basePath.replace(/\/+$/, '')}/${client.resource}/${client.pk}`

  const client = {
    axios,
    resource,
    pk,
    signal,
    async availableTransitions() {
      const url = `${base()}/available-transitions/`
      const { data } = signal ? await axios.get(url, { signal }) : await axios.get(url)
      return data
    },
    async history({ page = 1, pageSize } = {}) {
      const params = { page }
      if (pageSize) params.page_size = pageSize
      const url = `${base()}/history/`
      const { data } = signal
        ? await axios.get(url, { params, signal })
        : await axios.get(url, { params })
      return data
    },
    async previewTransition(targetState, { signal: callSignal } = {}) {
      const url = `${base()}/preview-transition/`
      const body = { target_state: targetState }
      const s = callSignal || signal
      const { data } = s
        ? await axios.post(url, body, { signal: s })
        : await axios.post(url, body)
      return data
    },
    async getMetadatos() {
      const url = `${base()}/metadatos/`
      const { data } = signal ? await axios.get(url, { signal }) : await axios.get(url)
      return data
    },
    async patchMetadatos(values) {
      const url = `${base()}/metadatos/`
      const { data } = signal
        ? await axios.patch(url, values, { signal })
        : await axios.patch(url, values)
      return data
    },
    async slaStatus() {
      const url = `${base()}/sla-status/`
      const { data } = signal
        ? await axios.post(url, null, { signal })
        : await axios.post(url, null)
      return data
    },
    async transition(payload) {
      const { body, config } = buildTransitionRequest(payload)
      const url = `${base()}/transition/`
      const { data } = signal
        ? await axios.post(url, body, { ...config, signal })
        : await axios.post(url, body, config)
      return data
    },
  }
  return client
}
