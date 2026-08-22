<template>
  <div class="data-grid-shell" :class="{ 'is-sticky-header': stickyHeader }" :style="shellStyle">
    <div v-if="columnChooser" class="grid-toolbar">
      <button
        type="button"
        class="grid-tool-button"
        :class="{ 'is-active': columnMenuOpen }"
        title="Chọn cột"
        aria-label="Chọn cột"
        :aria-expanded="columnMenuOpen"
        @click.stop="toggleColumnMenu"
      >
        <i class="fas fa-columns" aria-hidden="true"></i>
      </button>

      <div v-if="columnMenuOpen" class="column-menu" @click.stop>
        <div class="column-menu-title">Hiển thị cột</div>
        <div class="column-menu-list" role="group" aria-label="Danh sách cột hiển thị">
          <label v-for="column in orderedColumns" :key="column.key" class="column-menu-option">
            <input
              type="checkbox"
              :checked="isColumnVisible(column)"
              :disabled="isColumnVisibilityLocked(column)"
              @change="toggleColumnVisibility(column, $event.target.checked)"
            />
            <span :title="column.label">{{ column.label }}</span>
          </label>
        </div>
        <div class="column-menu-footer">
          <button type="button" @click="resetColumnSettings">Mặc định</button>
        </div>
      </div>
    </div>

    <table :style="tableStyle">
      <colgroup>
        <col v-for="column in visibleColumns" :key="column.key" :style="columnStyle(column)" />
      </colgroup>

      <thead>
        <tr class="heading-row">
          <th
            v-for="column in visibleColumns"
            :key="column.key"
            scope="col"
            :draggable="isColumnReorderable(column)"
            :aria-sort="ariaSort(column)"
            :class="{
              'is-filtered': isColumnFiltered(column),
              'is-filter-open': isFilterPanelOpen(column),
              'has-filter': filterable && column.filterable !== false,
              'has-sort': isColumnSortable(column),
              'is-sorted': isColumnSorted(column),
              'is-reorderable': isColumnReorderable(column),
              'is-dragging': dragColumnKey === column.key,
              'is-drag-over': dragOverColumnKey === column.key
            }"
            @dragstart="startColumnDrag($event, column)"
            @dragover.prevent="dragOverColumn($event, column)"
            @dragleave="leaveColumnDrag(column)"
            @drop.prevent="dropColumn($event, column)"
            @dragend="stopColumnDrag"
          >
            <button
              v-if="isColumnSortable(column)"
              type="button"
              class="heading-label heading-sort-button"
              :title="sortTitle(column)"
              @click="changeSort(column)"
            >
              <span class="heading-label-text">{{ column.label }}</span>
              <span class="sort-indicator" aria-hidden="true">{{ sortIndicator(column) }}</span>
            </button>
            <span v-else class="heading-label" :title="column.label">
              <span class="heading-label-text">{{ column.label }}</span>
            </span>
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
          <td :colspan="visibleColumnCount" class="empty">{{ loadingText }}</td>
        </tr>
        <tr v-else-if="sortedRows.length === 0">
          <td :colspan="visibleColumnCount" class="empty">
            {{ rows.length === 0 ? emptyText : noFilterResultText }}
          </td>
        </tr>
        <tr
          v-for="(row, rowIndex) in displayedRows"
          v-else
          :key="resolveRowKey(row, rowIndex)"
          :class="rowClassFor(row, rowIndex)"
        >
          <td
            v-for="column in visibleColumns"
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
  sortable: {
    type: Boolean,
    default: true
  },
  columnChooser: {
    type: Boolean,
    default: true
  },
  columnReorder: {
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
  },
  page: {
    type: Number,
    default: 0
  },
  limit: {
    type: Number,
    default: 0
  }
})

const filterText = {
  filterColumn: 'Lọc cột',
  searchValuesInColumn: 'Tìm giá trị trong cột',
  searchPlaceholder: 'Tìm kiếm...',
  selectAll: 'Chọn tất cả',
  unselect: 'Bỏ chọn',
  clearFilter: 'Xóa lọc',
  values: 'giá trị',
  filterValues: 'Giá trị lọc cột',
  noValues: 'Không có giá trị.'
}

const emit = defineEmits(['filtered-count'])
const valueFilters = reactive({})
const columnWidths = reactive({})
const columnOrder = ref([])
const hiddenColumnKeys = ref(new Set())
const activeFilterKey = ref('')
const filterSearch = ref('')
const draftSelectedValues = ref(new Set())
const columnMenuOpen = ref(false)
const dragColumnKey = ref('')
const dragOverColumnKey = ref('')
const clientSort = reactive({
  key: '',
  order: ''
})
let activeResize = null
let filterListenersBound = false
let columnMenuListenersBound = false

const widthStorageKey = computed(() => (props.storageKey ? `data-grid:${props.storageKey}:column-widths` : ''))
const columnSettingsStorageKey = computed(() => (props.storageKey ? `data-grid:${props.storageKey}:columns` : ''))
const columnByKey = computed(() => new Map(props.columns.map((column) => [column.key, column])))
const orderedColumns = computed(() => {
  const order = normalizeColumnOrder(columnOrder.value, new Set(props.columns.map((column) => column.key)))

  return order.map((key) => columnByKey.value.get(key)).filter(Boolean)
})
const visibleColumns = computed(() => {
  const visible = orderedColumns.value.filter((column) => !hiddenColumnKeys.value.has(column.key))

  return visible.length > 0 ? visible : orderedColumns.value.slice(0, 1)
})
const visibleColumnCount = computed(() => Math.max(visibleColumns.value.length, 1))
const filterCriteria = computed(() => {
  const filters = {}
  const visibleKeys = new Set(visibleColumns.value.map((column) => column.key))

  for (const [key, selected] of Object.entries(valueFilters)) {
    if (visibleKeys.has(key)) {
      filters[key] = { type: 'values', selected }
    }
  }

  return filters
})
const filteredRows = computed(() => filterGridRows(props.rows, visibleColumns.value, filterCriteria.value))
const activeSortKey = computed(() => clientSort.key)
const activeSortOrder = computed(() => clientSort.order)
const activeSortColumn = computed(
  () => props.columns.find((column) => sortKeyFor(column) === activeSortKey.value) || null
)
const sortedRows = computed(() => {
  if (!activeSortColumn.value || !activeSortOrder.value) {
    return filteredRows.value
  }

  return stableSortRows(filteredRows.value, activeSortColumn.value, activeSortOrder.value)
})
const displayedRows = computed(() => {
  const page = Number(props.page) || 0
  const limit = Number(props.limit) || 0

  if (page < 1 || limit < 1) {
    return sortedRows.value
  }

  const startIndex = (page - 1) * limit

  return sortedRows.value.slice(startIndex, startIndex + limit)
})
const activeFilterColumn = computed(
  () => visibleColumns.value.find((column) => column.key === activeFilterKey.value) || null
)
const filterOptions = computed(() => {
  if (!activeFilterColumn.value) {
    return []
  }

  return getGridColumnValueOptions(
    props.rows,
    visibleColumns.value,
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
const tableStyle = computed(() => ({
  width: `${visibleColumns.value.reduce((total, column) => total + (columnWidths[column.key] || 0), 0)}px`
}))
const shellStyle = computed(() => {
  if (!props.maxHeight) {
    return {}
  }

  return {
    maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
  }
})

function readJsonStorage(key) {
  if (!key || typeof window === 'undefined') {
    return null
  }

  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function writeJsonStorage(key, value) {
  if (!key || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Grid van hoat dong neu trinh duyet chan localStorage.
  }
}

function readStoredWidths() {
  return readJsonStorage(widthStorageKey.value) || {}
}

function readStoredColumnSettings() {
  return readJsonStorage(columnSettingsStorageKey.value) || {}
}

function normalizeColumnOrder(order, columnKeys) {
  const normalized = []
  const usedKeys = new Set()

  for (const key of Array.isArray(order) ? order : []) {
    if (columnKeys.has(key) && !usedKeys.has(key)) {
      normalized.push(key)
      usedKeys.add(key)
    }
  }

  for (const key of columnKeys) {
    if (!usedKeys.has(key)) {
      normalized.push(key)
    }
  }

  return normalized
}

function initializeColumns() {
  const storedWidths = readStoredWidths()
  const storedSettings = readStoredColumnSettings()
  const columnKeys = new Set()

  for (const column of props.columns) {
    columnKeys.add(column.key)

    const minWidth = Number(column.minWidth) || 56
    const storedWidth = Number(storedWidths[column.key])
    const defaultWidth = Number(column.width) || 140
    const preferredWidth = Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : defaultWidth
    columnWidths[column.key] = Math.max(minWidth, preferredWidth)
  }

  const preferredOrder = Array.isArray(storedSettings.order) ? storedSettings.order : columnOrder.value
  const preferredHidden = Array.isArray(storedSettings.hidden)
    ? storedSettings.hidden
    : Array.from(hiddenColumnKeys.value)

  columnOrder.value = normalizeColumnOrder(preferredOrder, columnKeys)
  hiddenColumnKeys.value = new Set(
    preferredHidden.filter((key) => columnKeys.has(key) && columnCanHide(columnByKey.value.get(key)))
  )

  if (hiddenColumnKeys.value.size >= props.columns.length && props.columns.length > 0) {
    hiddenColumnKeys.value.delete(props.columns[0].key)
  }

  for (const key of Object.keys(valueFilters)) {
    if (!columnKeys.has(key)) {
      delete valueFilters[key]
    }
  }

  if (activeFilterKey.value && !columnKeys.has(activeFilterKey.value)) {
    closeFilterPanel()
  }

  if (clientSort.key && !props.columns.some((column) => sortKeyFor(column) === clientSort.key)) {
    clientSort.key = ''
    clientSort.order = ''
  }
}

watch(() => props.columns, initializeColumns, { immediate: true })

watch(
  sortedRows,
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

watch(columnMenuOpen, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) {
    bindColumnMenuListeners()
    return
  }

  if (!isOpen && wasOpen) {
    unbindColumnMenuListeners()
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
  closeColumnMenu()

  if (isFilterPanelOpen(column)) {
    closeFilterPanel()
    return
  }

  openFilterPanel(column)
}

function openFilterPanel(column) {
  const options = getGridColumnValueOptions(props.rows, visibleColumns.value, filterCriteria.value, column.key)
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
  writeJsonStorage(widthStorageKey.value, { ...columnWidths })
}

function persistColumnSettings() {
  writeJsonStorage(columnSettingsStorageKey.value, {
    order: columnOrder.value,
    hidden: Array.from(hiddenColumnKeys.value)
  })
}

function columnCanHide(column) {
  return column?.hideable !== false
}

function isColumnVisible(column) {
  return !hiddenColumnKeys.value.has(column.key)
}

function isColumnVisibilityLocked(column) {
  return isColumnVisible(column) && visibleColumns.value.length <= 1
}

function toggleColumnVisibility(column, checked) {
  if (!columnCanHide(column)) {
    return
  }

  const hiddenKeys = new Set(hiddenColumnKeys.value)

  if (checked) {
    hiddenKeys.delete(column.key)
  } else if (!isColumnVisibilityLocked(column)) {
    hiddenKeys.add(column.key)
    delete valueFilters[column.key]

    if (activeFilterKey.value === column.key) {
      closeFilterPanel()
    }

    if (activeSortColumn.value?.key === column.key) {
      clientSort.key = ''
      clientSort.order = ''
    }
  }

  hiddenColumnKeys.value = hiddenKeys
  persistColumnSettings()
}

function toggleColumnMenu() {
  closeFilterPanel()
  columnMenuOpen.value = !columnMenuOpen.value
}

function closeColumnMenu() {
  columnMenuOpen.value = false
}

function resetColumnSettings() {
  columnOrder.value = props.columns.map((column) => column.key)
  hiddenColumnKeys.value = new Set()
  persistColumnSettings()
}

function isColumnReorderable(column) {
  return props.columnReorder && column?.reorderable !== false
}

function startColumnDrag(event, column) {
  if (!isColumnReorderable(column) || event.target?.closest?.('button, input, .resize-handle, .excel-filter-panel')) {
    event.preventDefault()
    return
  }

  closeFilterPanel()
  closeColumnMenu()
  dragColumnKey.value = column.key
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', column.key)
}

function dragOverColumn(event, column) {
  if (!dragColumnKey.value || dragColumnKey.value === column.key) {
    return
  }

  event.dataTransfer.dropEffect = 'move'
  dragOverColumnKey.value = column.key
}

function leaveColumnDrag(column) {
  if (dragOverColumnKey.value === column.key) {
    dragOverColumnKey.value = ''
  }
}

function dropColumn(event, targetColumn) {
  const sourceKey = dragColumnKey.value || event.dataTransfer.getData('text/plain')

  if (sourceKey && sourceKey !== targetColumn.key) {
    moveColumn(sourceKey, targetColumn.key)
  }

  stopColumnDrag()
}

function stopColumnDrag() {
  dragColumnKey.value = ''
  dragOverColumnKey.value = ''
}

function moveColumn(sourceKey, targetKey) {
  const nextOrder = normalizeColumnOrder(columnOrder.value, new Set(props.columns.map((column) => column.key)))
  const sourceIndex = nextOrder.indexOf(sourceKey)
  const targetIndex = nextOrder.indexOf(targetKey)

  if (sourceIndex < 0 || targetIndex < 0) {
    return
  }

  const [source] = nextOrder.splice(sourceIndex, 1)
  nextOrder.splice(targetIndex, 0, source)
  columnOrder.value = nextOrder
  persistColumnSettings()
}

function sortKeyFor(column) {
  return String(column.sortKey || column.field || column.key)
}

function isColumnSortable(column) {
  return props.sortable && column.sortable !== false
}

function isColumnSorted(column) {
  return activeSortKey.value === sortKeyFor(column) && Boolean(activeSortOrder.value)
}

function sortIndicator(column) {
  if (!isColumnSorted(column)) {
    return ''
  }

  return activeSortOrder.value === 'desc' ? '' : ''
}

function sortTitle(column) {
  return `${column.label} ${isColumnSorted(column) ? activeSortOrder.value : ''}`.trim()
}

function ariaSort(column) {
  if (!isColumnSorted(column)) {
    return 'none'
  }

  return activeSortOrder.value === 'desc' ? 'descending' : 'ascending'
}

function nextSortOrder(column) {
  if (!isColumnSorted(column)) {
    return 'asc'
  }

  return activeSortOrder.value === 'asc' ? 'desc' : 'asc'
}

function changeSort(column) {
  const sortKey = sortKeyFor(column)
  const sortOrder = nextSortOrder(column)


  clientSort.key = sortKey
  clientSort.order = sortOrder
}

function sortValue(row, column) {
  if (typeof column.sortValue === 'function') {
    return column.sortValue(row)
  }

  return getGridCellValue(row, column)
}

function isBlankSortValue(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function comparableNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = String(value).replace(/,/g, '').trim()
  const number = Number(normalized)

  return normalized !== '' && Number.isFinite(number) ? number : null
}

function comparableDate(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : null
}

function compareSortValues(left, right) {
  const leftBlank = isBlankSortValue(left)
  const rightBlank = isBlankSortValue(right)

  if (leftBlank || rightBlank) {
    if (leftBlank && rightBlank) {
      return 0
    }

    return leftBlank ? 1 : -1
  }

  const leftNumber = comparableNumber(left)
  const rightNumber = comparableNumber(right)

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber
  }

  const leftDate = comparableDate(left)
  const rightDate = comparableDate(right)

  if (leftDate !== null && rightDate !== null) {
    return leftDate - rightDate
  }

  return String(left).localeCompare(String(right), 'vi-VN', {
    numeric: true,
    sensitivity: 'base'
  })
}

function stableSortRows(rows, column, order) {
  const direction = order === 'desc' ? -1 : 1

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const result = compareSortValues(sortValue(left.row, column), sortValue(right.row, column))

      return result === 0 ? left.index - right.index : result * direction
    })
    .map((item) => item.row)
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
  closeColumnMenu()
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

function onColumnMenuKeydown(event) {
  if (event.key === 'Escape') {
    closeColumnMenu()
  }
}

function bindColumnMenuListeners() {
  if (columnMenuListenersBound || typeof document === 'undefined') {
    return
  }

  document.addEventListener('click', closeColumnMenu)
  document.addEventListener('keydown', onColumnMenuKeydown)
  columnMenuListenersBound = true
}

function unbindColumnMenuListeners() {
  if (!columnMenuListenersBound || typeof document === 'undefined') {
    return
  }

  document.removeEventListener('click', closeColumnMenu)
  document.removeEventListener('keydown', onColumnMenuKeydown)
  columnMenuListenersBound = false
}

function clearFilters() {
  for (const key of Object.keys(valueFilters)) {
    delete valueFilters[key]
  }

  closeFilterPanel()
}

defineExpose({ clearFilters, resetColumnSettings })
onBeforeUnmount(() => {
  stopColumnResize()
  unbindFilterPanelListeners()
  unbindColumnMenuListeners()
})
</script>

<style scoped>
.data-grid-shell {
  position: relative;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
  scrollbar-gutter: stable;
}

.grid-toolbar {
  position: sticky;
  z-index: 50;
  top: 0;
  display: flex;
  justify-content: flex-end;
  border-bottom: 1px solid var(--border-color);
  padding: 6px 8px;
  background: var(--surface-bg);
}

.grid-tool-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--muted-color);
  cursor: pointer;
}

.grid-tool-button:hover,
.grid-tool-button.is-active {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.column-menu {
  position: absolute;
  z-index: 80;
  top: 46px;
  right: 8px;
  box-sizing: border-box;
  width: 260px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  background: var(--surface-bg);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  color: var(--text-color);
}

.column-menu-title {
  margin-bottom: 8px;
  font-weight: 800;
}

.column-menu-list {
  display: grid;
  overflow: auto;
  max-height: 280px;
  gap: 2px;
}

.column-menu-option {
  display: grid;
  min-height: 30px;
  align-items: center;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
}

.column-menu-option:hover {
  background: var(--table-header-bg);
}

.column-menu-option input {
  margin: 0;
}

.column-menu-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-menu-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.column-menu-footer button {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 9px;
  background: var(--surface-bg);
  color: var(--text-color);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
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
  padding: 10px 8px;
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

.heading-row th.is-reorderable {
  cursor: grab;
}

.heading-row th.is-dragging {
  opacity: 0.56;
}

.heading-row th.is-drag-over::before {
  position: absolute;
  z-index: 6;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--primary-color);
  content: '';
}

.data-grid-shell.is-sticky-header thead th {
  position: sticky;
  top: 47px;
  z-index: 8;
}

.data-grid-shell.is-sticky-header .heading-row th.is-filter-open {
  z-index: 40;
}

.heading-label {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  padding-right: 0;
}

.heading-row th.has-filter .heading-label {
  padding-right: 18px;
}

.heading-label-text {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
}

.heading-sort-button {
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

.heading-sort-button:hover,
.heading-row th.is-sorted .heading-sort-button {
  color: var(--primary-color);
}

.sort-indicator {
  overflow: hidden;
  flex: 0 0 0;
  width: 0;
  color: var(--muted-color);
  font-size: 12px;
  opacity: 0;
  text-align: center;
  transition: flex-basis 0.15s ease, opacity 0.15s ease, width 0.15s ease;
}

.heading-sort-button:hover .sort-indicator,
.heading-row th.is-sorted .sort-indicator {
  flex-basis: 12px;
  width: 12px;
  opacity: 1;
}

.heading-row th.is-sorted .sort-indicator {
  color: var(--primary-color);
}

.filter-button {
  position: absolute;
  z-index: 4;
  top: 50%;
  right: 4px;
  display: inline-flex;
  width: 18px;
  height: 18px;
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
  border-top: 4px solid currentColor;
  border-right: 3px solid transparent;
  border-left: 3px solid transparent;
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
.filter-footer-button:hover,
.column-menu-footer button:hover {
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