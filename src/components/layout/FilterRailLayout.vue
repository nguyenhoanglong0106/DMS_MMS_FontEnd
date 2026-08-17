<template>
  <section class="filter-rail-layout" :style="layoutStyle">
    <aside ref="dockRef" class="filter-rail-dock" :class="{ 'is-collapsed': collapsed }">
      <header class="filter-rail-header">
        <div v-show="!collapsed" class="filter-rail-title">
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>

        <button
          type="button"
          class="filter-rail-toggle"
          :title="collapsed ? `Mở ${railLabel.toLowerCase()}` : `Ẩn ${railLabel.toLowerCase()}`"
          :aria-label="collapsed ? `Mở ${railLabel.toLowerCase()}` : `Ẩn ${railLabel.toLowerCase()}`"
          @click="toggleCollapsed"
        >
          <i :class="collapsed ? 'fas fa-angle-right' : 'fas fa-angle-left'" aria-hidden="true"></i>
        </button>
      </header>

      <span v-show="collapsed" class="filter-rail-label">
        <span v-for="line in railLabelLines" :key="line">{{ line }}</span>
      </span>

      <div v-show="!collapsed" class="filter-rail-body">
        <slot name="dock"></slot>
      </div>

      <span
        v-show="!collapsed"
        class="filter-rail-resize"
        aria-hidden="true"
        @pointerdown="startResize"
      ></span>
    </aside>

    <section class="filter-rail-content">
      <slot></slot>
    </section>
  </section>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  storageKey: {
    type: String,
    required: true
  },
  railLabel: {
    type: String,
    default: 'Bộ lọc'
  },
  defaultWidth: {
    type: Number,
    default: 300
  },
  minWidth: {
    type: Number,
    default: 260
  },
  maxWidth: {
    type: Number,
    default: 380
  },
  collapsedWidth: {
    type: Number,
    default: 48
  }
})

const dockRef = ref(null)
const collapsed = ref(readStoredBoolean(collapsedStorageKey(), false))
const dockWidth = ref(readStoredNumber(widthStorageKey(), props.defaultWidth))
let resizeStarted = false
let resizeLeft = 0

const layoutStyle = computed(() => ({
  '--rail-width': `${collapsed.value ? props.collapsedWidth : dockWidth.value}px`
}))
const railLabelLines = computed(() => props.railLabel.split(/\s+/).filter(Boolean))

function collapsedStorageKey() {
  return `${props.storageKey}_rail_collapsed`
}

function widthStorageKey() {
  return `${props.storageKey}_rail_width`
}

function readStoredBoolean(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const value = window.sessionStorage.getItem(key)

    if (value === null) return fallback

    return value === 'true'
  } catch {
    return fallback
  }
}

function readStoredNumber(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const value = Number(window.sessionStorage.getItem(key))

    if (Number.isFinite(value)) {
      return clamp(value, props.minWidth, props.maxWidth)
    }

    return fallback
  } catch {
    return fallback
  }
}

function storePreference(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(key, String(value))
  } catch {
    // Browser storage is optional for this UI preference.
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  storePreference(collapsedStorageKey(), collapsed.value)
}

function startResize(event) {
  if (collapsed.value || !dockRef.value) {
    return
  }

  resizeStarted = true
  resizeLeft = dockRef.value.getBoundingClientRect().left
  event.preventDefault()
  window.addEventListener('pointermove', resizeDock)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
  document.body.classList.add('is-filter-rail-resizing')
}

function resizeDock(event) {
  if (!resizeStarted) {
    return
  }

  dockWidth.value = clamp(event.clientX - resizeLeft, props.minWidth, props.maxWidth)
}

function stopResize() {
  if (!resizeStarted) {
    return
  }

  resizeStarted = false
  storePreference(widthStorageKey(), dockWidth.value)
  window.removeEventListener('pointermove', resizeDock)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
  document.body.classList.remove('is-filter-rail-resizing')
}

onUnmounted(stopResize)
</script>

<style scoped>
.filter-rail-layout {
  --rail-width: 300px;
  display: grid;
  grid-template-columns: var(--rail-width) minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
  min-width: 0;
}

.filter-rail-dock {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  height: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
  box-shadow: 0 12px 26px color-mix(in srgb, var(--text-color) 7%, transparent);
}

.filter-rail-dock.is-collapsed {
  box-shadow: none;
}

.filter-rail-header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid var(--border-color);
  padding: 11px 12px;
}

.filter-rail-dock.is-collapsed .filter-rail-header {
  justify-content: center;
  min-height: 54px;
  padding: 8px;
}

.filter-rail-title {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.filter-rail-title h1,
.filter-rail-title p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-rail-title h1 {
  color: var(--text-color);
  font-size: 24px;
  line-height: 1.2;
}

.filter-rail-title p {
  color: var(--muted-color);
  font-size: 14px;
}

.filter-rail-toggle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0;
  background: var(--surface-muted);
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.filter-rail-toggle:hover {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
  color: var(--primary-color);
}

.filter-rail-dock.is-collapsed .filter-rail-toggle {
  width: 32px;
  height: 32px;
  border-color: transparent;
  background: transparent;
}

.filter-rail-dock.is-collapsed .filter-rail-toggle:hover {
  border-color: var(--border-color);
  background: var(--surface-muted);
}

.filter-rail-label {
  position: absolute;
  top: 82px;
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 2px;
  width: 34px;
  border-radius: 8px;
  padding: 8px 0;
  color: var(--muted-color);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
  transform: translateX(-50%);
}

.filter-rail-label::before {
  width: 18px;
  height: 2px;
  margin-bottom: 4px;
  border-radius: 999px;
  background: var(--primary-color);
  content: '';
  opacity: 0.75;
}

.filter-rail-label span {
  display: block;
}

.filter-rail-body {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.filter-rail-resize {
  position: absolute;
  top: 0;
  right: -5px;
  z-index: 2;
  width: 10px;
  height: 100%;
  cursor: col-resize;
}

.filter-rail-resize::after {
  position: absolute;
  top: 12px;
  right: 4px;
  width: 2px;
  height: calc(100% - 24px);
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted-color) 24%, transparent);
  content: '';
  transition: background 0.2s ease;
}

.filter-rail-resize:hover::after {
  background: var(--primary-color);
}

.filter-rail-content {
  display: grid;
  align-content: start;
  min-width: 0;
  gap: 14px;
}

:global(body.is-filter-rail-resizing) {
  cursor: col-resize;
  user-select: none;
}

:deep(.dock-field) {
  display: grid;
  gap: 7px;
  color: var(--muted-color);
  font-size: 13px;
  font-weight: 800;
}

:deep(.dock-field input),
:deep(.dock-field select) {
  width: 100%;
  height: 38px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
}

:deep(.dock-actions) {
  display: grid;
  gap: 8px;
}

:deep(.dock-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 12px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font-weight: 800;
}

:deep(.dock-button.primary) {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #ffffff;
}

:deep(.dock-button.secondary) {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
}

:deep(.dock-section) {
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

:deep(.dock-section > strong) {
  color: var(--text-color);
  font-size: 13px;
}

:deep(.dock-section > span) {
  color: var(--muted-color);
  font-size: 12px;
}

:deep(.dock-icon-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.dock-icon-actions button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 9px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
}

@media (max-width: 900px) {
  .filter-rail-layout {
    grid-template-columns: var(--rail-width) minmax(0, 1fr);
  }

  .filter-rail-resize {
    display: none;
  }
}
</style>
