<template>
  <main class="import-page">
    <div class="window-title">DMS_SetUpDailyMenu</div>

    <div class="menu-strip">
      <span>File</span>
      <span>Edit</span>
      <span>Tools</span>
      <span>Actions</span>
      <span>Help</span>
    </div>

    <section class="info-panel">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden-input"
        @change="handleFileChange"
      />

      <button type="button" class="classic-button file-button" :disabled="loadingFile || saving" @click="openFilePicker">
        File
      </button>

      <div class="file-fields">
        <input class="classic-input" type="text" :value="fileName" readonly />
        <select class="classic-input classic-select" v-model="selectedSheet" :disabled="sheets.length === 0 || saving">
          <option v-for="sheet in sheets" :key="sheet.name" :value="sheet.name">
            {{ sheet.name }}
          </option>
        </select>
      </div>

      <button type="button" class="classic-button action-button" :disabled="!canImport" @click="importSelectedSheet">
        {{ loadingFile ? 'Import...' : 'Import' }}
      </button>

      <button type="button" class="classic-button save-button" :disabled="!canSave" @click="saveImportedRows">
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </section>

    <p v-if="message" class="status-message" :class="messageType">
      {{ message }}
    </p>

    <section class="grid-section">
      <div class="grid-caption">grdUpdate</div>

      <div class="grid-wrapper">
        <table class="update-grid">
          <thead>
            <tr>
              <th v-for="column in gridColumns" :key="column.key">
                {{ column.label }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in previewRows" :key="row._id" :class="{ failed: row._statusType === 'error' }">
              <td v-for="column in gridColumns" :key="column.key">
                {{ row[column.key] }}
              </td>
            </tr>

            <tr v-if="previewRows.length === 0">
              <td :colspan="gridColumns.length" class="empty-cell"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <footer class="status-bar">
      <span>CustPATC102 2026-06-01</span>
      <span>CAT THAI</span>
      <span>{{ currentDateText }}</span>
    </footer>
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
  { key: 'Company', label: 'Company' },
  { key: 'Key1', label: 'Key1' },
  { key: 'Key2', label: 'Key2' },
  { key: 'Key3', label: 'Key3' },
  { key: 'ShortChar01', label: 'ShortChar01' },
  { key: 'Date01', label: 'Date01' },
  { key: 'Date02', label: 'Date02' },
  { key: 'Character01', label: 'Character01' },
  { key: 'Character02', label: 'Character02' },
  { key: 'Character03', label: 'Character03' },
  { key: 'Character04', label: 'Character04' },
  { key: 'Character05', label: 'Character05' },
  { key: 'Character06', label: 'Character06' },
  { key: 'Character07', label: 'Character07' },
  { key: '_status', label: 'Status' }
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
      selectedSheet: '',
      previewRows: [],
      loadingFile: false,
      saving: false,
      message: '',
      messageType: '',
      currentDateText: new Date().toLocaleString('en-GB')
    }
  },

  computed: {
    canImport() {
      return Boolean(this.workbook && this.selectedSheet && !this.loadingFile && !this.saving)
    },

    canSave() {
      return this.previewRows.some((row) => row._statusType !== 'success') && !this.loadingFile && !this.saving
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
      this.selectedSheet = ''
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
        this.selectedSheet = this.sheets[0]?.name || ''

        if (this.sheets.length === 0) {
          throw new Error('File Excel không có sheet visible để import.')
        }
      } catch (error) {
        this.message = error.message
        this.messageType = 'error'
        this.workbook = null
        this.sheets = []
        this.selectedSheet = ''
      } finally {
        this.loadingFile = false
        event.target.value = ''
      }
    },

    async importSelectedSheet() {
      try {
        this.loadingFile = true
        this.message = ''
        this.messageType = ''

        const sheetRows = await readXlsxSheetRows(this.workbook, this.selectedSheet)
        const rows = buildDailyMenuRows(sheetRows)
        const invalidRow = rows.find((row) => !row.UD10_ShortChar01 || !row.UD10_Date01)

        if (rows.length === 0) {
          throw new Error('Sheet đã chọn không có dữ liệu thực đơn.')
        }

        if (invalidRow) {
          throw new Error('Dữ liệu import thiếu Thứ hoặc Ngày.')
        }

        this.previewRows = rows.map(createPreviewRow)
        this.message = `Import thành công ${this.previewRows.length} dòng.`
        this.messageType = 'success'
      } catch (error) {
        this.previewRows = []
        this.message = error.message
        this.messageType = 'error'
      } finally {
        this.loadingFile = false
      }
    },

    async saveImportedRows() {
      const rowsToSave = this.previewRows.filter((row) => row._statusType !== 'success')

      try {
        this.saving = true
        this.message = ''
        this.messageType = ''

        await importDailyMenus(
          rowsToSave.map((row) => row.form),
          ({ index }) => {
            const row = rowsToSave[index]
            row._status = 'Saved'
            row._statusType = 'success'
          }
        )

        this.previewRows = []
        this.message = 'Update thành công!'
        this.messageType = 'success'
      } catch (error) {
        const pendingRow = rowsToSave.find((row) => row._status !== 'Saved')

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
.import-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #d7e9fa;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
}

.window-title {
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5fc3dc;
  color: #000000;
  font-size: 14px;
}

.menu-strip {
  height: 42px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 12px;
  background: #b8d5f2;
  border-bottom: 1px solid #99b8d5;
}

.info-panel {
  min-height: 108px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 28px 20px;
  background: linear-gradient(#c8def2, #dcecf9);
  border: 1px solid #9cb7ce;
}

.hidden-input {
  display: none;
}

.classic-button {
  height: 29px;
  min-width: 102px;
  border: 1px solid #7f7f7f;
  background: #dedede;
  color: #000000;
  font-size: 12px;
  cursor: pointer;
  box-shadow: inset 1px 1px 0 #ffffff;
}

.classic-button:disabled {
  color: #777777;
  cursor: not-allowed;
}

.file-button {
  width: 58px;
  height: 47px;
  min-width: 58px;
}

.action-button {
  margin-left: 0;
}

.save-button {
  width: 128px;
}

.file-fields {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.classic-input {
  height: 21px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #9db8d2;
  background: #ffffff;
  color: #000000;
  font-size: 12px;
}

.classic-select {
  padding-left: 2px;
}

.status-message {
  min-height: 22px;
  margin: 0;
  padding: 6px 14px;
  background: #f2f2f2;
  font-weight: 700;
}

.status-message.success {
  color: #067a35;
}

.status-message.error {
  color: #ff0000;
}

.grid-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #ffffff;
  border-top: 1px solid #b7b7b7;
}

.grid-caption {
  height: 21px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9e9e9;
  border-bottom: 1px solid #c8c8c8;
  color: #000000;
}

.grid-wrapper {
  flex: 1;
  overflow: auto;
  background: #ffffff;
}

.update-grid {
  min-width: 1650px;
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.update-grid th,
.update-grid td {
  height: 28px;
  padding: 4px 6px;
  border: 1px solid #cfcfcf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #000000;
}

.update-grid th {
  background: #e8edf3;
  font-weight: 700;
}

.update-grid tr.failed td {
  color: #c00000;
}

.empty-cell {
  height: 520px;
  background: #ffffff;
}

.status-bar {
  height: 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: #d8d8d8;
  border-top: 1px solid #a9a9a9;
}

@media (max-width: 760px) {
  .info-panel {
    flex-wrap: wrap;
    padding: 16px;
  }

  .file-fields {
    width: calc(100% - 74px);
    min-width: 180px;
  }

  .classic-button {
    min-width: 88px;
  }
}
</style>
