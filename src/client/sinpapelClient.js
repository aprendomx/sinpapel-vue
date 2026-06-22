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

export function createSinpapelClient({ axios, basePath = '/sinpapel/api', resource, pk = null } = {}) {
  if (!axios) throw new Error('createSinpapelClient: `axios` instance is required')
  if (!resource) throw new Error('createSinpapelClient: `resource` slug is required')

  const base = () => `${basePath.replace(/\/+$/, '')}/${client.resource}/${client.pk}`

  const client = {
    axios,
    resource,
    pk,
    async availableTransitions() {
      const { data } = await axios.get(`${base()}/available-transitions/`)
      return data
    },
    async history({ page = 1, pageSize } = {}) {
      const params = { page }
      if (pageSize) params.page_size = pageSize
      const { data } = await axios.get(`${base()}/history/`, { params })
      return data
    },
    async previewTransition(targetState) {
      const { data } = await axios.post(`${base()}/preview-transition/`, { target_state: targetState })
      return data
    },
    async getMetadatos() {
      const { data } = await axios.get(`${base()}/metadatos/`)
      return data
    },
    async patchMetadatos(values) {
      const { data } = await axios.patch(`${base()}/metadatos/`, values)
      return data
    },
    async slaStatus() {
      const { data } = await axios.post(`${base()}/sla-status/`)
      return data
    },
    async transition(payload) {
      const { body, config } = buildTransitionRequest(payload)
      const { data } = await axios.post(`${base()}/transition/`, body, config)
      return data
    },
  }
  return client
}
