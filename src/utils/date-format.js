const DATE_OPTIONS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}

const HOUR_MINUTE_OPTIONS = {
  hour: '2-digit',
  minute: '2-digit'
}

function parseDate(value) {
  if (!value && value !== 0) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateOnly(value) {
  const date = parseDate(value)

  return date ? date.toLocaleDateString('vi-VN', DATE_OPTIONS) : '-'
}

export function formatDateFromInput(value) {
  if (!value) {
    return '-'
  }

  return formatDateOnly(new Date(`${value}T00:00:00`))
}

export function formatTimeOnly(value) {
  const date = parseDate(value)

  return date ? date.toLocaleTimeString('vi-VN') : '-'
}

export function formatHourMinute(value) {
  const date = parseDate(value)

  return date ? date.toLocaleTimeString('vi-VN', HOUR_MINUTE_OPTIONS) : '-'
}

export function formatDateTime(value) {
  const date = parseDate(value)

  return date ? `${formatTimeOnly(date)} ${formatDateOnly(date)}` : '-'
}

export function formatDateHourMinute(value) {
  const date = parseDate(value)

  return date ? `${formatDateOnly(date)} ${formatHourMinute(date)}` : '-'
}
