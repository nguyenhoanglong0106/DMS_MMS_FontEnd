const BLANK_VALUE_KEY = '__DATA_GRID_BLANK__'

// Lay gia tri goc cua mot o theo cau hinh cot. Cot co the dung field truc tiep
// hoac cung cap value(row) cho du lieu duoc tinh toan.
export function getGridCellValue(row, column) {
  if (typeof column.value === 'function') {
    return column.value(row)
  }

  return row?.[column.field || column.key]
}

export function formatGridCellValue(row, column) {
  const rawValue = getGridCellValue(row, column)
  return typeof column.format === 'function' ? column.format(rawValue, row) : rawValue
}

export function normalizeGridFilterValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/g, 'd')
    .trim()
}

export function getGridValueFilterKey(value) {
  const text = String(value ?? '')
  return text === '' ? BLANK_VALUE_KEY : `value:${text}`
}

function toGridValueFilterSet(filter) {
  if (!filter || typeof filter !== 'object' || filter.type !== 'values') {
    return null
  }

  const selected = Array.isArray(filter.selected) ? filter.selected : filter.values
  return new Set(Array.isArray(selected) ? selected.map(String) : [])
}

function buildTextFilter(column, value) {
  const keyword = normalizeGridFilterValue(value)
  return keyword ? { type: 'text', column, keyword } : null
}

function buildValueFilter(column, value) {
  const selected = toGridValueFilterSet(value)
  return selected ? { type: 'values', column, selected } : null
}

function buildActiveFilters(columns, filters) {
  const columnByKey = new Map(columns.map((column) => [column.key, column]))

  return Object.entries(filters)
    .map(([key, value]) => {
      const column = columnByKey.get(key)

      if (!column || column.filterable === false) {
        return null
      }

      return buildValueFilter(column, value) || buildTextFilter(column, value)
    })
    .filter(Boolean)
}

export function getGridColumnValueOptions(rows = [], columns = [], filters = {}, columnKey) {
  const column = columns.find((item) => item.key === columnKey)

  if (!column || column.filterable === false) {
    return []
  }

  const filtersWithoutCurrentColumn = Object.fromEntries(
    Object.entries(filters).filter(([key]) => key !== columnKey)
  )
  const sourceRows = filterGridRows(rows, columns, filtersWithoutCurrentColumn)
  const optionMap = new Map()

  for (const row of sourceRows) {
    const displayedValue = formatGridCellValue(row, column)
    const text = String(displayedValue ?? '')
    const key = getGridValueFilterKey(displayedValue)
    const existingOption = optionMap.get(key)

    if (existingOption) {
      existingOption.count += 1
      continue
    }

    optionMap.set(key, {
      key,
      label: text === '' ? '(Blanks)' : text,
      count: 1
    })
  }

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.key === BLANK_VALUE_KEY) {
      return 1
    }

    if (right.key === BLANK_VALUE_KEY) {
      return -1
    }

    return left.label.localeCompare(right.label, 'vi-VN', {
      numeric: true,
      sensitivity: 'base'
    })
  })
}

// Ham filter dung chung cho moi grid cau hinh theo columns.
// Ho tro ca keyword contains cu va filter dang checklist giong Excel.
export function filterGridRows(rows = [], columns = [], filters = {}) {
  const activeFilters = buildActiveFilters(columns, filters)

  if (activeFilters.length === 0) {
    return rows
  }

  return rows.filter((row) =>
    activeFilters.every((filter) => {
      const rawValue = getGridCellValue(row, filter.column)

      if (filter.type === 'values') {
        const displayedValue = formatGridCellValue(row, filter.column)
        return filter.selected.has(getGridValueFilterKey(displayedValue))
      }

      if (typeof filter.column.filter === 'function') {
        return filter.column.filter(row, filter.keyword, rawValue)
      }

      const displayedValue = formatGridCellValue(row, filter.column)
      return [rawValue, displayedValue].some((value) =>
        normalizeGridFilterValue(value).includes(filter.keyword)
      )
    })
  )
}
