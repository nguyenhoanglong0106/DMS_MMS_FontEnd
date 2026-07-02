<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1>Import thực đơn hằng ngày</h1>
      </div>

      <div class="header-actions">
        <button type="button" class="primary-button" :disabled="!canImport" @click="importVisibleSheets">
          {{ loadingFile ? 'Đang import...' : 'Import' }}
        </button>

        <button type="button" class="primary-button" :disabled="!canSave" @click="saveImportedRows">
          {{ saving ? 'Đang lưu...' : 'Lưu' }}
        </button>
      </div>
    </header>

    <input
      ref="fileInput"
      type="file"
      accept=".xlsx"
      class="hidden-input"
      @change="handleFileChange"
    />

    <section class="filter-form import-form">
      <label class="form-field file-name-field">
        <span>File Excel</span>
        <input type="text" :value="fileName" readonly placeholder="Chưa chọn file" />
      </label>

      <div class="filter-actions">
        <button type="button" class="secondary-button" :disabled="loadingFile || saving" @click="openFilePicker">
          {{ loadingFile ? 'Đang đọc...' : 'Chọn file' }}
        </button>
      </div>
    </section>

    <p v-if="message" :class="['message', messageType === 'error' ? 'error-message' : 'success-message']">
      {{ message }}
    </p>

    <section class="table-wrapper">
      <table class="data-table import-table">
        <thead>
          <tr>
            <th v-for="column in gridColumns" :key="column.key" :class="{ 'action-cell': column.key === '_action' }">
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in previewRows"
            :key="row._id"
            :class="{
              failed: row._statusType === 'error',
              skipped: row._statusType === 'skipped',
              saved: row._statusType === 'success'
            }"
          >
            <td v-for="column in gridColumns" :key="column.key" :class="{ 'action-cell': column.key === '_action' }">
              <button
                v-if="column.key === '_action'"
                type="button"
                class="row-delete-button"
                :disabled="loadingFile || saving"
                @click="removePreviewRow(row)"
              >
                Xóa
              </button>
              <span v-else>{{ row[column.key] }}</span>
            </td>
          </tr>

          <tr v-if="previewRows.length === 0">
            <td :colspan="gridColumns.length" class="no-data">
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script>
import { importDailyMenus } from '@/service/kineticApi'
import {
  buildDailyMenuRows,
  readXlsxSheetRows,
  readXlsxWorkbook
} from '@/service/xlsxMenuParser'

const DAILY_MENU_KEY1 = 'DMS_DailyMenu'
const DEFAULT_USER_ID = 'longn'

const GRID_COLUMNS = [
  { key: 'ShortChar01', label: 'Thứ' },
  { key: 'Date01', label: 'Ngày Thực Đơn' },
  { key: 'Character01', label: 'Món Chính 1' },
  { key: 'Character02', label: 'Món Chính 2' },
  { key: 'Character03', label: 'Món Chính 3' },
  { key: 'Character04', label: 'Món Chính 4' },
  { key: 'Character05', label: 'Món Chay 1' },
  { key: 'Character06', label: 'Món Chay 2' },
  { key: 'Character07', label: 'Tráng Miệng' },
  { key: '_action', label: 'Thao tác' }
]

function cleanEnv(value, fallback) {
  const cleanValue = String(value || '').trim().replace(/^['"]|['"]$/g, '').trim()
  return cleanValue || fallback
}

function createGuidPreview() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function getCurrentDateTimeText() {
  return new Date().toISOString().slice(0, 19)
}

function formatDateForGrid(value) {
  if (!value) {
    return ''
  }

  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function createPreviewRow(row, index) {
  return {
    _id: `${row.UD10_Date01}-${index}-${createGuidPreview()}`,
    _status: '',
    _statusType: '',
    Company: cleanEnv(process.env.VUE_APP_KINETIC_COMPANY, '01'),
    Key1: DAILY_MENU_KEY1,
    Key2: createGuidPreview(),
    Key3: DEFAULT_USER_ID,
    ShortChar01: row.UD10_ShortChar01,
    Date01: formatDateForGrid(row.UD10_Date01),
    Date02: getCurrentDateTimeText(),
    Character01: row.UD10_Character01,
    Character02: row.UD10_Character02,
    Character03: row.UD10_Character03,
    Character04: row.UD10_Character04,
    Character05: row.UD10_Character05,
    Character06: row.UD10_Character06,
    Character07: row.UD10_Character07,
    form: row
  }
}

export default {
  name: 'ImportMenuDaily',

  data() {
    return {
      gridColumns: GRID_COLUMNS,
      workbook: null,
      fileName: '',
      sheets: [],
      previewRows: [],
      loadingFile: false,
      saving: false,
      message: '',
      messageType: ''
    }
  },

  computed: {
    canImport() {
      return Boolean(this.workbook && this.sheets.length > 0 && !this.loadingFile && !this.saving)
    },

    canSave() {
      return this.previewRows.some((row) => !['success', 'skipped'].includes(row._statusType)) &&
        !this.loadingFile &&
        !this.saving
    }
  },

  methods: {
    openFilePicker() {
      this.$refs.fileInput.click()
    },

    resetImportState() {
      this.workbook = null
      this.fileName = ''
      this.sheets = []
      this.previewRows = []
      this.message = ''
      this.messageType = ''
    },

    async handleFileChange(event) {
      const [file] = event.target.files
      this.resetImportState()

      if (!file) {
        return
      }

      try {
        this.loadingFile = true
        this.fileName = file.name
        this.workbook = await readXlsxWorkbook(file)
        this.sheets = this.workbook.sheets

        if (this.sheets.length === 0) {
          throw new Error('File Excel không có sheet visible để import.')
        }
      } catch (error) {
        this.message = error.message
        this.messageType = 'error'
        this.workbook = null
        this.sheets = []
      } finally {
        this.loadingFile = false
        event.target.value = ''
      }
    },

    async importVisibleSheets() {
      try {
        this.loadingFile = true
        this.message = ''
        this.messageType = ''

        const rows = []

        for (const sheet of this.sheets) {
          const sheetRows = await readXlsxSheetRows(this.workbook, sheet.name)
          rows.push(...buildDailyMenuRows(sheetRows))
        }

        const invalidRow = rows.find((row) => !row.UD10_ShortChar01 || !row.UD10_Date01)

        if (rows.length === 0) {
          throw new Error('Các sheet visible không có dữ liệu thực đơn.')
        }

        if (invalidRow) {
          throw new Error('Dữ liệu import thiếu Thứ hoặc Ngày.')
        }

        this.previewRows = rows.map(createPreviewRow)
        this.message = `Import thành công ${this.previewRows.length} dòng từ ${this.sheets.length} sheet visible.`
        this.messageType = 'success'
      } catch (error) {
        this.previewRows = []
        this.message = error.message
        this.messageType = 'error'
      } finally {
        this.loadingFile = false
      }
    },

    removePreviewRow(row) {
      this.previewRows = this.previewRows.filter((item) => item._id !== row._id)
      this.message = 'Đã xóa dòng khỏi danh sách import.'
      this.messageType = 'success'
    },

    async saveImportedRows() {
      const rowsToSave = this.previewRows.filter((row) => !['success', 'skipped'].includes(row._statusType))

      try {
        this.saving = true
        this.message = ''
        this.messageType = ''

        const results = await importDailyMenus(
          rowsToSave.map((row) => row.form),
          ({ index, skipped, reason }) => {
            const row = rowsToSave[index]

            if (skipped) {
              row._status = reason
              row._statusType = 'skipped'
              return
            }

            row._status = 'Saved'
            row._statusType = 'success'
          }
        )

        const skippedCount = results.filter((result) => result.skipped).length
        const savedCount = results.length - skippedCount

        if (savedCount === 0) {
          this.message = `Không có dòng mới để lưu. Bỏ qua ${skippedCount} dòng đã tồn tại.`
        } else if (skippedCount > 0) {
          this.message = `Đã lưu ${savedCount} dòng mới, bỏ qua ${skippedCount} dòng đã tồn tại.`
        } else {
          this.message = `Update thành công ${savedCount} dòng!`
        }

        this.messageType = 'success'
        this.previewRows = []
      } catch (error) {
        const pendingRow = rowsToSave.find((row) => !['success', 'skipped'].includes(row._statusType))

        if (pendingRow) {
          pendingRow._status = error.message
          pendingRow._statusType = 'error'
        }

        this.message = error.message
        this.messageType = 'error'
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  padding: 24px;
  text-align: left;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 26px;
}

.header-actions,
.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-form {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  align-items: end;
  gap: 12px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.hidden-input {
  display: none;
}

.filter-actions {
  align-items: center;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
}

.form-field input,
.form-field select {
  height: 36px;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
}

.file-name-field input {
  background: #f8fafc;
}

.primary-button,
.secondary-button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.primary-button {
  background: #198754;
  color: #ffffff;
}

.secondary-button {
  background: #6c757d;
  color: #ffffff;
}

.message,
.success-message,
.error-message {
  margin: 12px 0;
  font-weight: 700;
}

.success-message {
  color: #047857;
}

.error-message {
  color: #dc2626;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
  background: #ffffff;
}

.data-table th,
.data-table td {
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-size: 14px;
  vertical-align: top;
}

.data-table th {
  background: #f3f4f6;
}

.import-table th,
.import-table td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-table tr.failed td {
  color: #dc2626;
}

.import-table tr.skipped td {
  color: #b45309;
}

.import-table tr.saved td {
  color: #047857;
}

.action-cell {
  text-align: center;
  white-space: nowrap;
}

.row-delete-button {
  padding: 7px 12px;
  border: none;
  border-radius: 4px;
  background: #dc3545;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

.no-data {
  height: 160px;
  text-align: center;
  color: #6b7280;
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }
}
</style>
