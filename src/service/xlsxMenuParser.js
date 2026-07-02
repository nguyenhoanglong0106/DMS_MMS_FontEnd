const ZIP_EOCD_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50
const COMPRESSION_STORE = 0
const COMPRESSION_DEFLATE = 8

const XLSX_WORKBOOK_PATH = 'xl/workbook.xml'
const XLSX_WORKBOOK_RELS_PATH = 'xl/_rels/workbook.xml.rels'
const XLSX_SHARED_STRINGS_PATH = 'xl/sharedStrings.xml'

const MENU_START_COLUMN = 2
const MENU_WEEKDAY_ROW = 2
const MENU_DATE_ROW = 3
const MENU_FIRST_DISH_ROW = 4
const MENU_DISH_COUNT = 7

const textDecoder = new TextDecoder('utf-8')

function readUint16(view, offset) {
  return view.getUint16(offset, true)
}

function readUint32(view, offset) {
  return view.getUint32(offset, true)
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 65557)

  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(view, offset) === ZIP_EOCD_SIGNATURE) {
      return offset
    }
  }

  throw new Error('File Excel không hợp lệ.')
}

function normalizeZipPath(path) {
  return path.replace(/^\/+/, '').replace(/\\/g, '/')
}

function parseZipDirectory(buffer) {
  const view = new DataView(buffer)
  const directory = new Map()
  const eocdOffset = findEndOfCentralDirectory(view)
  const entryCount = readUint16(view, eocdOffset + 10)
  let offset = readUint32(view, eocdOffset + 16)

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Không đọc được cấu trúc file Excel.')
    }

    const compression = readUint16(view, offset + 10)
    const compressedSize = readUint32(view, offset + 20)
    const uncompressedSize = readUint32(view, offset + 24)
    const fileNameLength = readUint16(view, offset + 28)
    const extraLength = readUint16(view, offset + 30)
    const commentLength = readUint16(view, offset + 32)
    const localHeaderOffset = readUint32(view, offset + 42)
    const fileNameBytes = new Uint8Array(buffer, offset + 46, fileNameLength)
    const fileName = normalizeZipPath(textDecoder.decode(fileNameBytes))

    directory.set(fileName, {
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    })

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return directory
}

async function inflateRaw(data) {
  if (!window.DecompressionStream) {
    throw new Error('Trình duyệt này chưa hỗ trợ đọc file .xlsx trực tiếp.')
  }

  const stream = new Blob([data]).stream().pipeThrough(new window.DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipText(archive, path) {
  const entry = archive.directory.get(normalizeZipPath(path))

  if (!entry) {
    return ''
  }

  const view = new DataView(archive.buffer)
  const localHeaderOffset = entry.localHeaderOffset

  if (readUint32(view, localHeaderOffset) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error('Không đọc được nội dung file Excel.')
  }

  const fileNameLength = readUint16(view, localHeaderOffset + 26)
  const extraLength = readUint16(view, localHeaderOffset + 28)
  const dataOffset = localHeaderOffset + 30 + fileNameLength + extraLength
  const compressed = new Uint8Array(archive.buffer, dataOffset, entry.compressedSize)
  let bytes

  if (entry.compression === COMPRESSION_STORE) {
    bytes = compressed
  } else if (entry.compression === COMPRESSION_DEFLATE) {
    bytes = await inflateRaw(compressed)
  } else {
    throw new Error('File Excel dùng kiểu nén chưa hỗ trợ.')
  }

  if (entry.uncompressedSize && bytes.length !== entry.uncompressedSize) {
    throw new Error('Dữ liệu Excel đọc ra không đúng kích thước.')
  }

  return textDecoder.decode(bytes)
}

function parseXml(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')

  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Không đọc được XML trong file Excel.')
  }

  return xml
}

function getElementsByLocalName(root, localName) {
  return Array.from(root.getElementsByTagName('*')).filter((node) => node.localName === localName)
}

function getAttributeByLocalName(node, localName) {
  const attributes = Array.from(node.attributes || [])
  const attribute = attributes.find((item) => item.localName === localName)
  return attribute ? attribute.value : ''
}

function resolveWorkbookTarget(target) {
  const cleanTarget = normalizeZipPath(target)
  return cleanTarget.startsWith('xl/') ? cleanTarget : `xl/${cleanTarget}`
}

function parseWorkbook(workbookXml, relsXml) {
  const workbook = parseXml(workbookXml)
  const rels = parseXml(relsXml)
  const relMap = new Map()

  getElementsByLocalName(rels, 'Relationship').forEach((relationship) => {
    relMap.set(relationship.getAttribute('Id'), relationship.getAttribute('Target'))
  })

  return getElementsByLocalName(workbook, 'sheet')
    .map((sheet) => {
      const relationshipId = getAttributeByLocalName(sheet, 'id')
      const state = sheet.getAttribute('state') || ''
      const target = relMap.get(relationshipId) || ''

      return {
        name: sheet.getAttribute('name'),
        state,
        path: resolveWorkbookTarget(target)
      }
    })
    .filter((sheet) => sheet.name && sheet.path && sheet.state !== 'hidden' && sheet.state !== 'veryHidden')
}

function parseSharedStrings(xmlText) {
  if (!xmlText) {
    return []
  }

  const xml = parseXml(xmlText)

  return getElementsByLocalName(xml, 'si').map((item) => {
    return getElementsByLocalName(item, 't').map((textNode) => textNode.textContent || '').join('')
  })
}

function columnNameToIndex(cellRef) {
  const letters = String(cellRef || '').match(/[A-Z]+/i)

  if (!letters) {
    return 0
  }

  return letters[0]
    .toUpperCase()
    .split('')
    .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

function rowNameToIndex(cellRef) {
  const numbers = String(cellRef || '').match(/\d+/)
  return numbers ? Number(numbers[0]) - 1 : 0
}

function getFirstChildText(node, localName) {
  const child = getElementsByLocalName(node, localName)[0]
  return child ? child.textContent || '' : ''
}

function parseCellValue(cell, sharedStrings) {
  const type = cell.getAttribute('t')
  const rawValue = getFirstChildText(cell, 'v')

  if (type === 's') {
    return sharedStrings[Number(rawValue)] || ''
  }

  if (type === 'inlineStr') {
    return getElementsByLocalName(cell, 't').map((node) => node.textContent || '').join('')
  }

  if (type === 'str') {
    return rawValue
  }

  if (rawValue === '') {
    return ''
  }

  const numberValue = Number(rawValue)
  return Number.isNaN(numberValue) ? rawValue : numberValue
}

function parseSheetRows(sheetXml, sharedStrings) {
  const xml = parseXml(sheetXml)
  const rows = []

  getElementsByLocalName(xml, 'c').forEach((cell) => {
    const cellRef = cell.getAttribute('r')
    const rowIndex = rowNameToIndex(cellRef)
    const columnIndex = columnNameToIndex(cellRef)

    if (!rows[rowIndex]) {
      rows[rowIndex] = []
    }

    rows[rowIndex][columnIndex] = parseCellValue(cell, sharedStrings)
  })

  return rows.map((row) => row || [])
}

function cleanCellText(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).replace(/\s+/g, ' ').trim()
}

function excelSerialToIsoDate(value) {
  const serial = Number(value)

  if (!Number.isFinite(serial)) {
    return ''
  }

  const date = new Date(Date.UTC(1899, 11, 30))
  date.setUTCDate(date.getUTCDate() + Math.floor(serial))

  return date.toISOString().slice(0, 10)
}

function parseDateText(value) {
  const text = cleanCellText(value)
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)

  if (!match) {
    return ''
  }

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]

  return `${year}-${month}-${day}`
}

function normalizeMenuDate(value) {
  if (typeof value === 'number') {
    return excelSerialToIsoDate(value)
  }

  if (String(value || '').match(/^\d+(\.\d+)?$/)) {
    return excelSerialToIsoDate(value)
  }

  return parseDateText(value)
}

function getMenuColumnCount(rows) {
  const relevantRows = rows.slice(MENU_WEEKDAY_ROW, MENU_FIRST_DISH_ROW + MENU_DISH_COUNT)
  const maxLength = relevantRows.reduce((max, row) => Math.max(max, row.length), 0)
  return Math.max(maxLength, MENU_START_COLUMN)
}

export async function readXlsxWorkbook(file) {
  if (!file || !file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Vui lòng chọn file Excel định dạng .xlsx.')
  }

  const buffer = await file.arrayBuffer()
  const archive = {
    buffer,
    directory: parseZipDirectory(buffer)
  }

  const workbookXml = await readZipText(archive, XLSX_WORKBOOK_PATH)
  const relsXml = await readZipText(archive, XLSX_WORKBOOK_RELS_PATH)
  const sharedStringsXml = await readZipText(archive, XLSX_SHARED_STRINGS_PATH)

  return {
    archive,
    sheets: parseWorkbook(workbookXml, relsXml),
    sharedStrings: parseSharedStrings(sharedStringsXml)
  }
}

export async function readXlsxSheetRows(workbook, sheetName) {
  const sheet = workbook.sheets.find((item) => item.name === sheetName)

  if (!sheet) {
    throw new Error('Không tìm thấy sheet đã chọn.')
  }

  const sheetXml = await readZipText(workbook.archive, sheet.path)
  return parseSheetRows(sheetXml, workbook.sharedStrings)
}

export function buildDailyMenuRows(rows) {
  const importedRows = []
  const totalColumns = getMenuColumnCount(rows)

  for (let columnIndex = MENU_START_COLUMN; columnIndex < totalColumns; columnIndex += 1) {
    const date = normalizeMenuDate(rows[MENU_DATE_ROW]?.[columnIndex])
    const values = Array.from({ length: MENU_DISH_COUNT }, (_, index) => {
      return cleanCellText(rows[MENU_FIRST_DISH_ROW + index]?.[columnIndex])
    })

    if (!date && values.every((value) => value === '')) {
      continue
    }

    importedRows.push({
      UD10_ShortChar01: cleanCellText(rows[MENU_WEEKDAY_ROW]?.[columnIndex]),
      UD10_Date01: date,
      UD10_Character01: values[0],
      UD10_Character02: values[1],
      UD10_Character03: values[2],
      UD10_Character04: values[3],
      UD10_Character05: values[4],
      UD10_Character06: values[5],
      UD10_Character07: values[6]
    })
  }

  return importedRows
}
