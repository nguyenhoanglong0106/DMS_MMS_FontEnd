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
// Kiểm tra cấu hình bắt buộc trước khi gọi API.
function assertConfig() {
  if (config.apiVersion === 'v2' && !config.company) {
    throw new Error('Thiếu VUE_APP_KINETIC_COMPANY trong file .env.')
  }
}

// Tạo đường dẫn gốc theo phiên bản API Kinetic.
function getServiceRoot() {
  assertConfig()

  if (config.apiVersion === 'v1') {
    return `${config.baseUrl}/api/v1`
  }

  return `${config.baseUrl}/api/v2/odata/${encodeURIComponent(config.company)}`
}

// Tạo header chung cho request Kinetic.
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

// Ghép URL API với query string.
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

// Gửi request đến Kinetic và xử lý lỗi chung.
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

// Parse JSON an toàn từ response text.
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

// Lấy thông báo lỗi dễ đọc từ payload API.
function getErrorMessage(payload, status) {
  return payload?.ErrorMessage ||
    payload?.error?.message ||
    payload?.message ||
    `Kinetic API trả về lỗi HTTP ${status}.`
}

//xu ly du lieu
// Escape chuỗi để dùng trong filter OData.
function escapeODataString(value) {
  return String(value || '').replace(/'/g, "''")
}

// Xóa dấu gạch chéo cuối URL.
function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

// Đọc biến môi trường với giá trị mặc định.
function readEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim()
}

// Xóa dấu gạch chéo đầu và cuối path.
function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '')
}

// Tạo GUID dùng làm khóa phụ.
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

// Tạo segment khóa UD10 cho request theo record.
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

// Tạo path API đến một record UD10 cụ thể.
function getUd10RecordPath(item) {
  return `${config.servicePath}(${getUd10KeySegment(item)})`
}

// Chuẩn hóa ngày sang định dạng DateTime của Kinetic.
function normalizeDate(value) {
  if (!value) {
    return null
  }

  return value.length === 10 ? `${value}T00:00:00` : value
}

// Lấy phần yyyy-mm-dd để so sánh ngày.
function getDateKey(value) {
  return String(value || '').slice(0, 10)
}

// Tạo khóa kiểm trùng theo Key1 và Date01.
function getDailyMenuImportKey(value) {
  return `${DAILY_MENU_KEY1}|${getDateKey(value)}`
}

// Lấy thời gian hiện tại theo format Kinetic.
function getCurrentKineticDateTime() {
  return new Date().toISOString().slice(0, 19)
}

// Chuyển record Kinetic sang model dùng trong màn hình.
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

// Chuyển form trên UI sang record UD10 gửi lên Kinetic.
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

// Kiểm tra kết nối đến Kinetic.
export async function testKineticConnection() {
  await kineticRequest(config.servicePath, {
    query: {
      $top: 1
    }
  })

  return true
}

// Lấy danh sách thực đơn hằng ngày.
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

// Tạo mới một dòng thực đơn.
export async function createDailyMenu(form) {
  const payload = await kineticRequest(config.servicePath, {
    method: 'POST',
    body: toKineticRecord(form)
  })

  return payload ? fromKineticRecord(payload) : null
}

// Lấy các khóa thực đơn đã tồn tại để tránh import trùng.
async function getExistingDailyMenuImportKeys(forms) {
  const dateKeys = new Set(forms.map((form) => getDateKey(form.UD10_Date01)).filter(Boolean))

  if (dateKeys.size === 0) {
    return new Set()
  }

  const existingKeys = new Set()
  const pageSize = 1000
  let skip = 0
  let pageRows = []

  do {
    const payload = await kineticRequest(config.servicePath, {
      query: {
        $select: 'Key1,Date01',
        $filter: `Key1 eq '${escapeODataString(DAILY_MENU_KEY1)}'`,
        $top: pageSize,
        $skip: skip
      }
    })

    pageRows = Array.isArray(payload?.value) ? payload.value : []

    pageRows.forEach((row) => {
      const dateKey = getDateKey(row.Date01)

      if (dateKeys.has(dateKey)) {
        existingKeys.add(getDailyMenuImportKey(row.Date01))
      }
    })

    skip += pageRows.length
  } while (pageRows.length === pageSize)

  return existingKeys
}

// Import nhiều dòng, bỏ qua dòng đã trùng Key1 và Date01.
export async function importDailyMenus(forms, onProgress) {
  const results = []
  const importedKeys = await getExistingDailyMenuImportKeys(forms)

  for (let index = 0; index < forms.length; index += 1) {
    const form = forms[index]
    const importKey = getDailyMenuImportKey(form.UD10_Date01)

    if (importedKeys.has(importKey)) {
      const result = {
        skipped: true,
        reason: 'Đã tồn tại Key1 và Date01.'
      }

      results.push(result)

      if (onProgress) {
        onProgress({
          index,
          total: forms.length,
          ...result
        })
      }

      continue
    }

    const result = await createDailyMenu(form)
    const importResult = {
      skipped: false,
      result
    }

    importedKeys.add(importKey)
    results.push(importResult)

    if (onProgress) {
      onProgress({
        index,
        total: forms.length,
        ...importResult
      })
    }
  }

  return results
}

// Cập nhật một dòng thực đơn.
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

// Xóa một dòng thực đơn.
export async function deleteDailyMenu(item) {
  await kineticRequest(getUd10RecordPath(item), {
    method: 'DELETE',
    headers: {
      'If-Match': '*'
    }
  })

  return true
}
