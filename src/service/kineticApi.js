const DEFAULT_SERVICE_PATH = 'Ice.BO.UD10Svc/UD10s'
const DAILY_MENU_KEY1 = 'DMS_DailyMenu'
const DEFAULT_USER_ID = 'longn'

const config = {
  baseUrl: trimTrailingSlash(readEnv('VUE_APP_KINETIC_BASE_URL', '/kinetic-api')),
  apiVersion: readEnv('VUE_APP_KINETIC_API_VERSION', 'v1'),
  company: readEnv('VUE_APP_KINETIC_COMPANY'),
  apiKey: readEnv('VUE_APP_KINETIC_API_KEY'),
  username: readEnv('VUE_APP_KINETIC_USERNAME'),
  password: readEnv('VUE_APP_KINETIC_PASSWORD'),
  servicePath: trimSlashes(readEnv('VUE_APP_KINETIC_SERVICE_PATH', DEFAULT_SERVICE_PATH))
}

//kết nối 
function assertConfig() {
  if (config.apiVersion === 'v2' && !config.company) {
    throw new Error('Thiếu VUE_APP_KINETIC_COMPANY trong file .env.')
  }
}

function getServiceRoot() {
  assertConfig()

  if (config.apiVersion === 'v1') {
    return `${config.baseUrl}/api/v1`
  }

  return `${config.baseUrl}/api/v2/odata/${encodeURIComponent(config.company)}`
}

function getHeaders(extraHeaders = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extraHeaders
  }

  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey
  }

  if (config.username && config.password) {
    headers.Authorization = `Basic ${window.btoa(`${config.username}:${config.password}`)}`
  }

  return headers
}

function buildUrl(path = '', query = {}) {
  const cleanPath = trimSlashes(path)
  const url = new URL(`${getServiceRoot()}/${cleanPath}`, window.location.origin)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

async function kineticRequest(path, options = {}) {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method || 'GET',
    headers: getHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  const payload = parseJson(text)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status))
  }

  return payload
}

function parseJson(text) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    return {
      message: text
    }
  }
}

function getErrorMessage(payload, status) {
  return payload?.ErrorMessage ||
    payload?.error?.message ||
    payload?.message ||
    `Kinetic API trả về lỗi HTTP ${status}.`
}

//xu ly du lieu
function escapeODataString(value) {
  return String(value || '').replace(/'/g, "''")
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function readEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim()
}

function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '')
}

export function createGuid() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

//xu ly API
const UD10_SELECT_FIELDS = [
  'Company',
  'Key1',
  'Key2',
  'Key3',
  'Key4',
  'Key5',
  'ShortChar01',
  'Date01',
  'Character01',
  'Character02',
  'Character03',
  'Character04',
  'Character05',
  'Character06',
  'Character07',
  'SysRowID'
]

function getUd10KeySegment(item) {
  const company = item.Company || config.company
  return [
    `Company='${escapeODataString(company)}'`,
    `Key1='${escapeODataString(item.Key1)}'`,
    `Key2='${escapeODataString(item.Key2)}'`,
    `Key3='${escapeODataString(item.Key3)}'`,
    `Key4='${escapeODataString(item.Key4)}'`,
    `Key5='${escapeODataString(item.Key5)}'`
  ].join(',')
}

function getUd10RecordPath(item) {
  return `${config.servicePath}(${getUd10KeySegment(item)})`
}

function normalizeDate(value) {
  if (!value) {
    return null
  }

  return value.length === 10 ? `${value}T00:00:00` : value
}

function getCurrentKineticDateTime() {
  return new Date().toISOString().slice(0, 19)
}

function fromKineticRecord(record) {
  return {
    ...record,
    UD10_ShortChar01: record.UD10_ShortChar01 ?? record.ShortChar01 ?? '',
    UD10_Date01: record.UD10_Date01 ?? record.Date01 ?? '',
    UD10_Character01: record.UD10_Character01 ?? record.Character01 ?? '',
    UD10_Character02: record.UD10_Character02 ?? record.Character02 ?? '',
    UD10_Character03: record.UD10_Character03 ?? record.Character03 ?? '',
    UD10_Character04: record.UD10_Character04 ?? record.Character04 ?? '',
    UD10_Character05: record.UD10_Character05 ?? record.Character05 ?? '',
    UD10_Character06: record.UD10_Character06 ?? record.Character06 ?? '',
    UD10_Character07: record.UD10_Character07 ?? record.Character07 ?? ''
  }
}

function toKineticRecord(form, sourceItem = {}) {
  const record = {
    Company: sourceItem.Company || config.company,
    Key1: sourceItem.Key1 || DAILY_MENU_KEY1,
    Key2: sourceItem.Key2 || createGuid(),
    Key3: sourceItem.Key3 || DEFAULT_USER_ID,
    Key4: sourceItem.Key4 || '',
    Key5: sourceItem.Key5 || '',
    ShortChar01: form.UD10_ShortChar01,
    Date01: normalizeDate(form.UD10_Date01),
    Character01: form.UD10_Character01,
    Character02: form.UD10_Character02,
    Character03: form.UD10_Character03,
    Character04: form.UD10_Character04,
    Character05: form.UD10_Character05,
    Character06: form.UD10_Character06,
    Character07: form.UD10_Character07
  }

  if (!sourceItem.Key2) {
    record.Date02 = getCurrentKineticDateTime()
  }

  return record
}

export async function testKineticConnection() {
  await kineticRequest(config.servicePath, {
    query: {
      $top: 1
    }
  })

  return true
}

export async function getDailyMenus() {
  const payload = await kineticRequest(config.servicePath, {
    query: {
      $select: UD10_SELECT_FIELDS.join(','),
      $filter: `Key1 eq '${escapeODataString(DAILY_MENU_KEY1)}'`,
      $orderby: 'Date01 desc',
         $top: 30
    }
  })

  const rows = Array.isArray(payload?.value) ? payload.value : []
  return rows.map(fromKineticRecord)
}

export async function createDailyMenu(form) {
  const payload = await kineticRequest(config.servicePath, {
    method: 'POST',
    body: toKineticRecord(form)
  })

  return payload ? fromKineticRecord(payload) : null
}

export async function importDailyMenus(forms, onProgress) {
  const results = []

  for (let index = 0; index < forms.length; index += 1) {
    const form = forms[index]
    const result = await createDailyMenu(form)
    results.push(result)

    if (onProgress) {
      onProgress({
        index,
        total: forms.length,
        result
      })
    }
  }

  return results
}

export async function updateDailyMenu(item, form) {
  const record = toKineticRecord(form, item)

  await kineticRequest(getUd10RecordPath(record), {
    method: 'PATCH',
    headers: {
      'If-Match': '*'
    },
    body: record
  })

  return true
}

export async function deleteDailyMenu(item) {
  await kineticRequest(getUd10RecordPath(item), {
    method: 'DELETE',
    headers: {
      'If-Match': '*'
    }
  })

  return true
}
