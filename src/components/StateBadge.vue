<template>
  <span class="sp-badge" :style="badgeStyle">
    <span class="sp-badge__dot" :style="dotStyle"></span>
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  estado: { type: String, required: true },
  color: { type: String, default: '' },
  label: { type: String, default: '' },
})

const displayLabel = computed(() => props.label || (props.estado || 'N/A').replace(/_/g, ' '))
const badgeStyle = computed(() => {
  if (!props.color) return {}
  return {
    backgroundColor: `color-mix(in srgb, ${props.color} 16%, white)`,
    color: props.color,
  }
})
const dotStyle = computed(() => (props.color ? { backgroundColor: props.color } : {}))
</script>

<style scoped>
.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-family: var(--sp-font);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  background: var(--sp-badge-bg);
  color: var(--sp-badge-text);
}
.sp-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--sp-badge-text);
}
</style>
