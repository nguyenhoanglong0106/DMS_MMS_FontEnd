<template>
  <div class="dashboard-page">
    <h2>Thực đơn hằng ngày - Epicor</h2>

    <div class="toolbar">
      <button type="button" class="primary-button" :disabled="saving" @click="openAddForm">
        Thêm
      </button>
    </div>

    <form v-if="showForm" class="menu-form" @submit.prevent="saveItem">
      <h3>{{ formTitle }}</h3>

      <div v-if="formError" class="form-error">
        {{ formError }}
      </div>

      <div class="form-grid">
        <label class="form-field">
          <span>Thứ <strong>*</strong></span>
          <input v-model.trim="form.UD10_ShortChar01" type="text" />
        </label>

        <label class="form-field">
          <span>Ngày <strong>*</strong></span>
          <input v-model="form.UD10_Date01" type="date" />
        </label>

        <label
          v-for="field in characterFields"
          :key="field.key"
          class="form-field"
        >
          <span>{{ field.label }}</span>
          <input v-model.trim="form[field.key]" type="text" />
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="primary-button" :disabled="saving">
          {{ saving ? 'Đang lưu...' : 'Lưu' }}
        </button>

        <button type="button" class="secondary-button" :disabled="saving" @click="cancelForm">
          Hủy
        </button>
      </div>
    </form>

    <div v-if="loading" class="message">
      Đang tải dữ liệu...
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-if="!loading && !errorMessage" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Thứ</th>
            <th>Ngày</th>
            <th>Món 1</th>
            <th>Món 2</th>
            <th>Món 3</th>
            <th>Món 4</th>
            <th>Món chay 1</th>
            <th>Món chay 2</th>
            <th>Tráng miệng</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in pagedItems" :key="item.SysRowID || item.RowIdent">
            <td>{{ item.UD10_ShortChar01 }}</td>
            <td>{{ formatDate(item.UD10_Date01) }}</td>
            <td>{{ item.UD10_Character01 }}</td>
            <td>{{ item.UD10_Character02 }}</td>
            <td>{{ item.UD10_Character03 }}</td>
            <td>{{ item.UD10_Character04 }}</td>
            <td>{{ item.UD10_Character05 }}</td>
            <td>{{ item.UD10_Character06 }}</td>
            <td>{{ item.UD10_Character07 }}</td>
            <td class="action-cell">
              <button
                type="button"
                class="edit-button"
                :disabled="saving || deletingRowId !== null || !item.SysRowID"
                @click="openEditForm(item)"
              >
                Sửa
              </button>

              <button
                type="button"
                class="delete-button"
                :disabled="saving || deletingRowId !== null || !item.SysRowID"
                @click="deleteItem(item)"
              >
                {{ deletingRowId === item.SysRowID ? 'Đang xóa...' : 'Xóa' }}
              </button>
            </td>
          </tr>

          <tr v-if="pagedItems.length === 0">
            <td colspan="10" class="no-data">
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-if="!loading && !errorMessage"
      :total-items="items.length"
      :current-page="currentPage"
      :page-size="pageSize"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />
  </div>
</template>

<script>
import Pagination from '@/components/functable/Pagination.vue'
import {
  createDailyMenu,
  deleteDailyMenu,
  getDailyMenus,
  updateDailyMenu
} from '@/service/kineticApi'

const CHARACTER_FIELDS = [
  { key: 'UD10_Character01', label: 'Món 1' },
  { key: 'UD10_Character02', label: 'Món 2' },
  { key: 'UD10_Character03', label: 'Món 3' },
  { key: 'UD10_Character04', label: 'Món 4' },
  { key: 'UD10_Character05', label: 'Món chay 1' },
  { key: 'UD10_Character06', label: 'Món chay 2' },
  { key: 'UD10_Character07', label: 'Tráng miệng' }
]

function createEmptyForm() {
  return {
    UD10_ShortChar01: '',
    UD10_Date01: '',
    UD10_Character01: '',
    UD10_Character02: '',
    UD10_Character03: '',
    UD10_Character04: '',
    UD10_Character05: '',
    UD10_Character06: '',
    UD10_Character07: ''
  }
}

function toForm(item) {
  return {
    UD10_ShortChar01: item.UD10_ShortChar01 || '',
    UD10_Date01: (item.UD10_Date01 || '').slice(0, 10),
    UD10_Character01: item.UD10_Character01 || '',
    UD10_Character02: item.UD10_Character02 || '',
    UD10_Character03: item.UD10_Character03 || '',
    UD10_Character04: item.UD10_Character04 || '',
    UD10_Character05: item.UD10_Character05 || '',
    UD10_Character06: item.UD10_Character06 || '',
    UD10_Character07: item.UD10_Character07 || ''
  }
}

export default {
  name: 'HomePage',

  components: {
    Pagination
  },

  data() {
    return {
      characterFields: CHARACTER_FIELDS,
      items: [],
      currentPage: 1,
      pageSize: 25,
      loading: false,
      saving: false,
      deletingRowId: null,
      errorMessage: '',
      showForm: false,
      form: createEmptyForm(),
      formError: '',
      editingItem: null
    }
  },

  computed: {
    formTitle() {
      return this.editingItem === null ? 'Thêm thực đơn' : 'Sửa thực đơn'
    },

    totalPages() {
      return Math.ceil(this.items.length / this.pageSize) || 1
    },

    pagedItems() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.items.slice(start, start + this.pageSize)
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    async loadData() {
      try {
        this.loading = true
        this.errorMessage = ''
        this.items = await getDailyMenus()
        this.currentPage = Math.min(this.currentPage, this.totalPages)
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading = false
      }
    },

    openAddForm() {
      this.form = createEmptyForm()
      this.formError = ''
      this.editingItem = null
      this.showForm = true
    },

    openEditForm(item) {
      if (!item.SysRowID) {
        this.errorMessage = 'Không tìm thấy khóa UD10 của dòng cần sửa.'
        return
      }

      this.form = toForm(item)
      this.formError = ''
      this.editingItem = item
      this.showForm = true
    },

    cancelForm() {
      this.showForm = false
      this.form = createEmptyForm()
      this.formError = ''
      this.editingItem = null
    },

    validateForm() {
      if (!this.form.UD10_ShortChar01) {
        return 'Vui lòng nhập thứ.'
      }

      if (!this.form.UD10_Date01) {
        return 'Vui lòng nhập ngày.'
      }

      const duplicateDate = this.items.some((item) => {
        return (item.UD10_Date01 || '').slice(0, 10) === this.form.UD10_Date01 &&
          item.SysRowID !== (this.editingItem && this.editingItem.SysRowID)
      })

      if (duplicateDate) {
        return 'Ngày này đã có thực đơn.'
      }

      return ''
    },

    async saveItem() {
      this.formError = this.validateForm()

      if (this.formError) {
        return
      }

      try {
        this.saving = true

        if (this.editingItem === null) {
          await createDailyMenu(this.form)
        } else {
          await updateDailyMenu(this.editingItem, this.form)
        }

        this.cancelForm()
        await this.loadData()
      } catch (error) {
        this.formError = error.message
      } finally {
        this.saving = false
      }
    },

    async deleteItem(item) {
      const date = this.formatDate(item.UD10_Date01)

      if (!window.confirm(`Bạn có chắc muốn xóa thực đơn ngày ${date}?`)) {
        return
      }

      try {
        this.deletingRowId = item.SysRowID
        this.errorMessage = ''
        await deleteDailyMenu(item)

        if (this.editingItem && this.editingItem.SysRowID === item.SysRowID) {
          this.cancelForm()
        }

        await this.loadData()
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.deletingRowId = null
      }
    },

    formatDate(value) {
      if (!value) {
        return ''
      }

      const [year, month, day] = value.slice(0, 10).split('-')
      return `${day}/${month}/${year}`
    },

    handlePageChange(page) {
      this.currentPage = page
    },

    handlePageSizeChange(size) {
      this.pageSize = size
      this.currentPage = 1
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.menu-form {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #d7d7d7;
  border-radius: 6px;
  background: #ffffff;
}

.menu-form h3 {
  margin: 0 0 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: bold;
}

.form-field input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.form-field strong {
  color: red;
}

.form-error {
  margin-bottom: 12px;
  color: red;
  font-weight: bold;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.primary-button,
.secondary-button,
.edit-button,
.delete-button {
  padding: 7px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
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

.message {
  margin: 12px 0;
  color: #333;
}

.error-message {
  margin: 12px 0;
  color: red;
  font-weight: bold;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  min-width: 1500px;
  border-collapse: collapse;
  background: #ffffff;
}

.data-table th,
.data-table td {
  border: 1px solid #ddd;
  padding: 8px;
  font-size: 14px;
  vertical-align: top;
}

.data-table th {
  background: #f2f2f2;
  font-weight: bold;
}

.action-cell {
  text-align: center;
  white-space: nowrap;
}

.action-cell button + button {
  margin-left: 6px;
}

.edit-button {
  background: #ffc107;
  color: #000000;
}

.delete-button {
  background: #dc3545;
  color: #ffffff;
}

.no-data {
  text-align: center;
  color: #777;
}
</style>
