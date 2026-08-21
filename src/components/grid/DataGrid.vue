<template>
  <div class="data-grid-shell" :class="{ 'is-sticky-header': stickyHeader }" :style="shellStyle">
    <table :style="tableStyle">
      <colgroup>
        <col v-for="column in columns" :key="column.key" :style="columnStyle(column)" />
      </colgroup>

      <thead>
        <tr class="heading-row">
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :class="{
              'is-filtered': isColumnFiltered(column),
              'is-filter-open': isFilterPanelOpen(column)
            }"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="heading-label heading-sort-button"
              :title="column.label"
              @click="emit('sort', column.sortKey || column.key)"
            >
              {{ column.label }}
            </button>
            <span v-else class="heading-label" :title="column.label">{{ column.label }}</span>
            <button
              v-if="filterable && column.filterable !== false"
              class="filter-button"
              :class="{
                'is-active': isFilterPanelOpen(column),
                'is-filtered': isColumnFiltered(column)
              }"
              type="button"
              :aria-label="`${filterText.filterColumn} ${column.label}`"
              :aria-expanded="isFilterPanelOpen(column)"
              @click.stop="toggleFilterPanel(column)"
            >
              <span class="filter-caret" aria-hidden="true"></span>
            </button>

            <div v-if="isFilterPanelOpen(column)" class="excel-filter-panel" @click.stop>
              <div class="filter-panel-title" :title="column.label">{{ column.label }}</div>

              <input
                v-model="filterSearch"
                class="filter-search"
                type="search"
                :aria-label="`${filterText.searchValuesInColumn} ${column.label}`"
                :placeholder="filterText.searchPlaceholder"
              />

              <div class="filter-quick-actions">
                <button type="button" @click="toggleVisibleFilterValues(true)">
                  {{ filterText.selectAll }}
                </button>
                <button type="button" @click="toggleVisibleFilterValues(false)">
                  {{ filterText.unselect }}
                </button>
                <button type="button" :disabled="!isColumnFiltered(column)" @click="clearActiveFilter">
                  {{ filterText.clearFilter }}
                </button>
              </div>

              <div class="filter-status">
                {{ selectedFilterCount }} / {{ filterOptions.length }} {{ filterText.values }}
              </div>

              <div class="filter-list" :aria-label="`${filterText.filterValues} ${column.label}`" role="group">
                <p v-if="visibleFilterOptions.length === 0" class="filter-empty">
                  {{ filterText.noValues }}
                </p>
                <label v-for="option in visibleFilterOptions" :key="option.key" class="filter-option">
                  <input
                    type="checkbox"
                    :checked="draftSelectedValues.has(option.key)"
                    @change="toggleDraftFilterValue(option.key, $event.target.checked)"
                  />
                  <span class="filter-option-label" :title="option.label">{{ option.label }}</span>
                  <span class="filter-option-count">{{ option.count }}</span>
                </label>
              </div>

              <div class="filter-footer">
                <button type="button" class="filter-footer-button" @click="closeFilterPanel">Cancel</button>
                <button type="button" class="filter-footer-button primary" @click="applyFilterPanel">OK</button>
              </div>
            </div>

            <span
              class="resize-handle"
              role="separator"
              aria-orientation="vertical"
              :aria-label="`Thay đổi độ rộng cột ${column.label}`"
              @dblclick.stop="resetColumnWidth(column)"
              @pointerdown.prevent="startColumnResize($event, column)"
            ></span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="empty">{{ loadingText }}</td>
        </tr>
        <tr v-else-if="filteredRows.length === 0">
          <td :colspan="columns.length" class="empty">
            {{ rows.length === 0 ? emptyText : noFilterResultText }}
          </td>
        </tr>
        <tr
          v-for="(row, rowIndex) in filteredRows"
          v-else
          :key="resolveRowKey(row, rowIndex)"
          :class="rowClassFor(row, rowIndex)"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            :class="cellClassFor(row, column)"
            :title="cellTitle(row, column)"
          >
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :column="column"
              :value="displayCellValue(row, column)"
              :raw-value="rawCellValue(row, column)"
              :index="rowIndex"
            >
              {{ displayCellValue(row, column) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  filterGridRows,
  formatGridCellValue,
  getGridCellValue,
  getGridColumnValueOptions,
  normalizeGridFilterValue
} from '@/utils/grid-filter'

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },
  rowKey: {
    type: [String, Function],
    default: '_id'
  },
  storageKey: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  filterable: {
    type: Boolean,
    default: true
  },
  loadingText: {
    type: String,
    default: 'Đang tải dữ liệu...'
  },
  emptyText: {
    type: String,
    default: 'Không có dữ liệu.'
  },
  noFilterResultText: {
    type: String,
    default: 'Không có dòng nào khớp bộ lọc.'
  },
  maxHeight: {
    type: [String, Number],
    default: ''
  },
  stickyHeader: {
    type: Boolean,
    default: false
  },
  rowClass: {
    type: [String, Array, Object, Function],
    default: ''
  }
})

const filterText = {
  filterColumn: 'L\u1ecdc c\u1ed9t',
  searchValuesInColumn: 'T\u00ecm gi\u00e1 tr\u1ecb trong c\u1ed9t',
  searchPlaceholder: 'T\u00ecm ki\u1ebfm...',
  selectAll: 'Ch\u1ecdn t\u1ea5t c\u1ea3',
  unselect: 'B\u1ecf ch\u1ecdn',
  clearFilter: 'X\u00f3a l\u1ecdc',
  values: 'gi\u00e1 tr\u1ecb',
  filterValues: 'Gi\u00e1 tr\u1ecb l\u1ecdc c\u1ed9t',
  noValues: 'Kh\u00f4ng c\u00f3 gi\u00e1 tr\u1ecb.'
}

const emit = defineEmits(['filtered-count', 'sort'])
const valueFilters = reactive({})
const columnWidths = reactive({})
const activeFilterKey = ref('')
const filterSearch = ref('')
const draftSelectedValues = ref(new Set())
let activeResize = null
let filterListenersBound = false

const widthStorageKey = computed(() => (props.storageKey ? `data-grid:${props.storageKey}:column-widths` : ''))
const filterCriteria = computed(() => {
  const filters = {}

  for (const [key, selected] of Object.entries(valueFilters)) {
    filters[key] = { type: 'values', selected }
  }

  return filters
})
const filteredRows = computed(() => filterGridRows(props.rows, props.columns, filterCriteria.value))
const activeFilterColumn = computed(
  () => props.columns.find((column) => column.key === activeFilterKey.value) || null
)
const filterOptions = computed(() => {
  if (!activeFilterColumn.value) {
    return []
  }

  return getGridColumnValueOptions(
    props.rows,
    props.columns,
    filterCriteria.value,
    activeFilterColumn.value.key
  )
})
const visibleFilterOptions = computed(() => {
  const keyword = normalizeGridFilterValue(filterSearch.value)

  if (!keyword) {
    return filterOptions.value
  }

  return filterOptions.value.filter((option) => normalizeGridFilterValue(option.label).includes(keyword))
})
const selectedFilterCount = computed(() => {
  const optionKeys = new Set(filterOptions.value.map((option) => option.key))
  let count = 0

  for (const key of draftSelectedValues.value) {
    if (optionKeys.has(key)) {
      count += 1
    }
  }

  return count
})

function readStoredWidths() {
  if (!widthStorageKey.value || typeof window === 'undefined') {
    return {}
  }

  try {
    return JSON.parse(window.localStorage.getItem(widthStorageKey.value) || '{}')
  } catch {
    return {}
  }
}

function initializeColumns() {
  const storedWidths = readStoredWidths()
  const columnKeys = new Set()

  for (const column of props.columns) {
    columnKeys.add(column.key)

    const minWidth = Number(column.minWidth) || 56
    const storedWidth = Number(storedWidths[column.key])
    const defaultWidth = Number(column.width) || 140
    const preferredWidth = Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : defaultWidth
    columnWidths[column.key] = Math.max(minWidth, preferredWidth)
  }

  for (const key of Object.keys(valueFilters)) {
    if (!columnKeys.has(key)) {
      delete valueFilters[key]
    }
  }

  if (activeFilterKey.value && !columnKeys.has(activeFilterKey.value)) {
    closeFilterPanel()
  }
}

watch(() => props.columns, initializeColumns, { immediate: true })

watch(
  filteredRows,
  (value) => {
    emit('filtered-count', value.length)
  },
  { immediate: true }
)

watch(activeFilterKey, (key, previousKey) => {
  if (key && !previousKey) {
    bindFilterPanelListeners()
    return
  }

  if (!key && previousKey) {
    unbindFilterPanelListeners()
  }
})

const tableStyle = computed(() => ({
  width: `${props.columns.reduce((total, column) => total + (columnWidths[column.key] || 0), 0)}px`
}))
const shellStyle = computed(() => {
  if (!props.maxHeight) {
    return {}
  }

  return {
    maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  }
})

function columnStyle(column) {
  return { width: `${columnWidths[column.key] || column.width || 140}px` }
}

function displayCellValue(row, column) {
  const displayedValue = formatGridCellValue(row, column)
  return displayedValue ?? ''
}

function rawCellValue(row, column) {
  return getGridCellValue(row, column)
}

function resolveClass(classValue, ...args) {
  return typeof classValue === 'function' ? classValue(...args) : classValue
}

function rowClassFor(row, rowIndex) {
  return resolveClass(props.rowClass, row, rowIndex)
}

function cellClassFor(row, column) {
  return resolveClass(column.cellClass, row, column)
}

function cellTitle(row, column) {
  const value = displayCellValue(row, column)
  return value === null || value === undefined ? '' : String(value)
}

function resolveRowKey(row, index) {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row, index)
  }

  return row?.[props.rowKey] || row?._id || row?.RowIdent || index
}

function hasOwnFilter(key) {
  return Object.prototype.hasOwnProperty.call(valueFilters, key)
}

function isColumnFiltered(column) {
  return hasOwnFilter(column.key)
}

function isFilterPanelOpen(column) {
  return activeFilterKey.value === column.key
}

function toggleFilterPanel(column) {
  if (isFilterPanelOpen(column)) {
    closeFilterPanel()
    return
  }

  openFilterPanel(column)
}

function openFilterPanel(column) {
  const options = getGridColumnValueOptions(props.rows, props.columns, filterCriteria.value, column.key)
  const selected = valueFilters[column.key]

  filterSearch.value = ''
  draftSelectedValues.value = new Set(Array.isArray(selected) ? selected : options.map((option) => option.key))
  activeFilterKey.value = column.key
}

function closeFilterPanel() {
  activeFilterKey.value = ''
  filterSearch.value = ''
  draftSelectedValues.value = new Set()
}

function toggleDraftFilterValue(key, checked) {
  const nextValues = new Set(draftSelectedValues.value)

  if (checked) {
    nextValues.add(key)
  } else {
    nextValues.delete(key)
  }

  draftSelectedValues.value = nextValues
}

function toggleVisibleFilterValues(checked) {
  const nextValues = new Set(draftSelectedValues.value)

  for (const option of visibleFilterOptions.value) {
    if (checked) {
      nextValues.add(option.key)
    } else {
      nextValues.delete(option.key)
    }
  }

  draftSelectedValues.value = nextValues
}

function applyFilterPanel() {
  const column = activeFilterColumn.value

  if (!column) {
    return
  }

  const optionKeys = filterOptions.value.map((option) => option.key)
  const optionKeySet = new Set(optionKeys)
  const selectedKeys = Array.from(draftSelectedValues.value)
  const allCurrentOptionsSelected = optionKeys.every((key) => draftSelectedValues.value.has(key))
  const selectedOnlyCurrentOptions = selectedKeys.every((key) => optionKeySet.has(key))

  if (allCurrentOptionsSelected && selectedOnlyCurrentOptions) {
    delete valueFilters[column.key]
  } else {
    valueFilters[column.key] = selectedKeys
  }

  closeFilterPanel()
}

function clearActiveFilter() {
  if (activeFilterColumn.value) {
    delete valueFilters[activeFilterColumn.value.key]
  }

  closeFilterPanel()
}

function persistColumnWidths() {
  if (!widthStorageKey.value || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(widthStorageKey.value, JSON.stringify({ ...columnWidths }))
  } catch {
    // Grid vẫn resize bình thường nếu trình duyệt chặn localStorage.
  }
}

function onColumnResize(event) {
  if (!activeResize) {
    return
  }

  const nextWidth = activeResize.startWidth + event.clientX - activeResize.startX
  columnWidths[activeResize.key] = Math.max(activeResize.minWidth, nextWidth)
}

function stopColumnResize() {
  if (!activeResize) {
    return
  }

  activeResize = null
  persistColumnWidths()
  document.removeEventListener('pointermove', onColumnResize)
  document.removeEventListener('pointerup', stopColumnResize)
  document.removeEventListener('pointercancel', stopColumnResize)
  document.body.classList.remove('is-data-grid-resizing')
}

function startColumnResize(event, column) {
  if (event.button !== 0) {
    return
  }

  stopColumnResize()
  closeFilterPanel()
  activeResize = {
    key: column.key,
    startX: event.clientX,
    startWidth: columnWidths[column.key],
    minWidth: Number(column.minWidth) || 56
  }
  document.addEventListener('pointermove', onColumnResize)
  document.addEventListener('pointerup', stopColumnResize)
  document.addEventListener('pointercancel', stopColumnResize)
  document.body.classList.add('is-data-grid-resizing')
}

function resetColumnWidth(column) {
  columnWidths[column.key] = Number(column.width) || 140
  persistColumnWidths()
}

function onFilterKeydown(event) {
  if (event.key === 'Escape') {
    closeFilterPanel()
  }
}

function bindFilterPanelListeners() {
  if (filterListenersBound || typeof document === 'undefined') {
    return
  }

  document.addEventListener('click', closeFilterPanel)
  document.addEventListener('keydown', onFilterKeydown)
  filterListenersBound = true
}

function unbindFilterPanelListeners() {
  if (!filterListenersBound || typeof document === 'undefined') {
    return
  }

  document.removeEventListener('click', closeFilterPanel)
  document.removeEventListener('keydown', onFilterKeydown)
  filterListenersBound = false
}

function clearFilters() {
  for (const key of Object.keys(valueFilters)) {
    delete valueFilters[key]
  }

  closeFilterPanel()
}

defineExpose({ clearFilters })
onBeforeUnmount(() => {
  stopColumnResize()
  unbindFilterPanelListeners()
})
</script>

<style scoped>
.data-grid-shell {
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
  scrollbar-gutter: stable;
}

table {
  min-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

th,
td {
  box-sizing: border-box;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color);
  padding: 10px 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

th {
  position: relative;
  background: var(--table-header-bg);
  color: var(--text-color);
  font-weight: 800;
}

.heading-row th {
  overflow: visible;
}

.heading-row th.is-filter-open {
  z-index: 20;
}

.data-grid-shell.is-sticky-header thead th {
  position: sticky;
  top: 0;
  z-index: 8;
}

.data-grid-shell.is-sticky-header .heading-row th.is-filter-open {
  z-index: 40;
}

.heading-label {
  display: block;
  overflow: hidden;
  padding-right: 28px;
  text-overflow: ellipsis;
}

.heading-sort-button {
  width: 100%;
  border: 0;
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: inherit;
  text-align: left;
}

.heading-sort-button:hover {
  color: var(--primary-color);
}

.filter-button {
  position: absolute;
  z-index: 4;
  top: 50%;
  right: 10px;
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-color);
  cursor: pointer;
  transform: translateY(-50%);
}

.filter-button:hover,
.filter-button.is-active,
.filter-button.is-filtered {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--primary-color);
}

.filter-caret {
  width: 0;
  height: 0;
  border-top: 5px solid currentColor;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
}

.excel-filter-panel {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 8px;
  box-sizing: border-box;
  width: 300px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  background: var(--surface-bg);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  color: var(--text-color);
  font-weight: 400;
}

.filter-panel-title {
  overflow: hidden;
  margin-bottom: 8px;
  font-weight: 800;
  text-overflow: ellipsis;
}

.filter-search {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 7px 9px;
  background: var(--surface-bg);
  color: var(--text-color);
  font: inherit;
  outline: none;
}

.filter-search:focus {
  border-color: var(--primary-color);
}

.filter-quick-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.filter-quick-actions button,
.filter-footer-button {
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
}

.filter-quick-actions button {
  flex: 1;
}

.filter-quick-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.filter-quick-actions button:not(:disabled):hover,
.filter-footer-button:hover {
  border-color: var(--primary-color);
}

.filter-status {
  margin-top: 8px;
  color: var(--muted-color);
  font-size: 12px;
}

.filter-list {
  overflow: auto;
  max-height: 224px;
  margin-top: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--surface-bg);
}

.filter-option {
  display: grid;
  min-height: 30px;
  align-items: center;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 7px;
  padding: 4px 8px;
  cursor: pointer;
  font-weight: 400;
}

.filter-option:hover {
  background: var(--table-header-bg);
}

.filter-option input {
  margin: 0;
}

.filter-option-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-option-count {
  color: var(--muted-color);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.filter-empty {
  margin: 0;
  padding: 12px;
  color: var(--muted-color);
  text-align: center;
  white-space: normal;
}

.filter-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.filter-footer-button.primary {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #fff;
}

.resize-handle {
  position: absolute;
  z-index: 5;
  top: 0;
  right: -5px;
  width: 11px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
}

.resize-handle::after {
  position: absolute;
  top: 20%;
  bottom: 20%;
  left: 5px;
  width: 1px;
  background: var(--border-color);
  content: '';
}

.resize-handle:hover::after {
  width: 2px;
  background: var(--primary-color);
}

.empty {
  padding: 34px;
  color: var(--muted-color);
  text-align: center;
  white-space: normal;
}

:global(body.is-data-grid-resizing) {
  cursor: col-resize;
  user-select: none;
}
</style>
