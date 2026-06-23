<template>
  <div class="demo">
    <h1>sinpapel-vue · demo</h1>
    <form class="demo__cfg" @submit.prevent="apply">
      <label>Base path <input v-model="cfg.basePath" /></label>
      <label>Resource <input v-model="cfg.resource" /></label>
      <label>PK <input v-model="cfg.pk" /></label>
      <label>Estado actual <input v-model="cfg.currentState" /></label>
      <label><input v-model="cfg.canEvaluateSla" type="checkbox" /> SLA admin</label>
      <button type="submit">Montar</button>
    </form>

    <seguimiento-panel
      v-if="mounted"
      :key="mountKey"
      :axios="http"
      :base-path="active.basePath"
      :resource="active.resource"
      :pk="active.pk"
      :current-state="active.currentState"
      :can-evaluate-sla="active.canEvaluateSla"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import axios from 'axios'
import { SeguimientoPanel } from '../src/index.js'

// Consumer owns the axios instance (auth, baseURL, interceptors).
const http = axios.create({ withCredentials: true })

const cfg = reactive({ basePath: '/sinpapel/api', resource: 'solicitudes', pk: '1', currentState: 'EN_REVISION', canEvaluateSla: false })
const active = reactive({ ...cfg })
const mounted = ref(false)
const mountKey = ref(0)

function apply() {
  Object.assign(active, cfg)
  mounted.value = true
  mountKey.value += 1
}
</script>

<style>
body { margin: 0; }
.demo { max-width: 760px; margin: 0 auto; padding: 24px; font-family: 'Inter', system-ui, sans-serif; }
.demo h1 { font-size: 20px; }
.demo__cfg { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px; padding: 16px; border: 1px solid #dfe3e8; border-radius: 8px; }
.demo__cfg label { display: flex; flex-direction: column; font-size: 12px; gap: 4px; }
.demo__cfg input { padding: 6px 8px; border: 1px solid #dfe3e8; border-radius: 6px; }
.demo__cfg button { padding: 8px 16px; border: none; border-radius: 6px; background: #3a4a5c; color: #fff; cursor: pointer; }
</style>
