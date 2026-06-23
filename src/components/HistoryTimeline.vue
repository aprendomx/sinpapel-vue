<template>
  <div v-if="entries && entries.length" class="sp-timeline">
    <div
      v-for="(item, idx) in entries"
      :key="item.history_id ?? idx"
      class="sp-tl-entry"
    >
      <div class="sp-tl-left">
        <div class="sp-tl-node">
          <q-icon :name="iconFor(item.history_type)" size="13px" />
        </div>
        <div v-if="idx < entries.length - 1" class="sp-tl-line"></div>
      </div>
      <div class="sp-tl-content">
        <div class="sp-tl-header">
          <span class="sp-tl-reason">{{ item.history_change_reason || labelFor(item.history_type) }}</span>
          <span class="sp-tl-date">{{ formatDate(item.history_date) }}</span>
        </div>
        <div class="sp-tl-user">{{ item.history_user || 'Sistema' }}</div>
      </div>
    </div>
  </div>
  <div v-else class="sp-tl-empty">Sin movimientos registrados</div>
</template>

<script setup>
defineProps({ entries: { type: Array, default: () => [] } })

const ICONS = { '+': 'add_circle', '~': 'edit', '-': 'remove_circle' }
const LABELS = { '+': 'Creado', '~': 'Modificado', '-': 'Eliminado' }
const iconFor = (t) => ICONS[t] || 'circle'
const labelFor = (t) => LABELS[t] || 'Cambio'
const formatDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('es-MX') } catch { return d }
}
</script>

<style scoped>
.sp-timeline { font-family: var(--sp-font); padding: 4px 0; }
.sp-tl-entry { display: flex; gap: 14px; }
.sp-tl-left { display: flex; flex-direction: column; align-items: center; width: 26px; flex-shrink: 0; }
.sp-tl-node {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--sp-color-primary); color: var(--sp-color-on-primary);
}
.sp-tl-line { width: 2px; flex: 1; min-height: 18px; background: var(--sp-border); margin: 4px 0; }
.sp-tl-content {
  flex: 1; background: var(--sp-surface);
  border: 1px solid var(--sp-border); border-left: 3px solid var(--sp-color-primary);
  border-radius: 6px; padding: 9px 13px; margin-bottom: 10px;
}
.sp-tl-header { display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.sp-tl-reason { font-weight: 700; font-size: 12px; color: var(--sp-text); }
.sp-tl-date { font-size: 11px; color: var(--sp-text-muted); white-space: nowrap; }
.sp-tl-user { font-size: 11px; color: var(--sp-text-muted); margin-top: 4px; }
.sp-tl-empty {
  text-align: center; padding: 36px 16px;
  color: var(--sp-text-muted); font-family: var(--sp-font); font-size: 13px;
}
</style>
