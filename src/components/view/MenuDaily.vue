<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1>Thực đơn hằng ngày</h1>
      </div>

      <div class="header-actions">
        <button type="button" class="secondary-button" :disabled="testing" @click="testConnection">
          {{ testing ? 'Đang kiểm tra...' : 'Load' }}
        </button>

        <button type="button" class="primary-button" :disabled="saving" @click="openAddForm">
          Thêm
        </button>
      </div>
    </header>

    <p v-if="connectionMessage" class="success-message">
      {{ connectionMessage }}
    </p>

    <form class="filter-form" @submit.prevent="searchByDate">
      <label class="form-field">
        <span>Từ ngày</span>
        <input v-model="dateFilter.fromDate" type="date" />
      </label>

      <label class="form-field">
        <span>Đến ngày</span>
        <input v-model="dateFilter.toDate" type="date" />
      </label>

      <div class="filter-actions">
        <button type="submit" class="primary-button" :disabled="loading">
          Tìm
        </button>

        <button
          type="button"
          class="secondary-button"
          :disabled="loading || !hasDateFilter"
          @click="clearDateFilter"
        >
          Xóa lọc
        </button>
      </div>
    </form>

    <p v-if="filterError" class="form-error">
      {{ filterError }}
    </p>

    <form v-if="showForm" class="menu-form" @submit.prevent="saveItem">
      <h2>{{ formTitle }}</h2>

      <p v-if="formError" class="form-error">
        {{ formError }}
      </p>

      <div class="form-grid">
        <label class="form-field">
          <span>Thứ <strong>*</strong></span>
          <input v-model.trim="form.UD10_ShortChar01" type="text" />
        </label>

        <label class="form-field">
          <span>Ngày <strong>*</strong></span>
          <input v-model="form.UD10_Date01" type="date" />
        </label>

        <label v-for="field in characterFields" :key="field.key" class="form-field">
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

    <p v-if="loading" class="message">
      Đang tải dữ liệu...
    </p>

    <p v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </p>

    <section v-if="!loading && !errorMessage" class="table-wrapper">
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
          <tr v-for="item in pagedItems" :key="item.SysRowID || item.Key1">
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
                :disabled="saving || deletingKey !== ''"
                @click="openEditForm(item)"
              >
                Sửa
              </button>

              <button
                type="button"
                class="delete-button"
                :disabled="saving || deletingKey !== ''"
                @click="deleteItem(item)"
              >
                {{ deletingKey === item.Key1 ? 'Đang xóa...' : 'Xóa' }}
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
    </section>

    <Pagination
      v-if="!loading && !errorMessage"
      :total-items="items.length"
      :current-page="currentPage"
      :page-size="pageSize"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    />
  </main>
</template>

<script>
import Pagination from '@/components/functable/Pagination.vue'
import {
  createDailyMenu,
  deleteDailyMenu,
  getDailyMenus,
  testKineticConnection,
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

// Tạo form trống cho thêm mới thực đơn.
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

// Chuyển record API sang dữ liệu form.
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
  name: 'MenuDaily',

  components: {
    Pagination
  },

  // Khởi tạo trạng thái màn thực đơn.
  data() {
    return {
      characterFields: CHARACTER_FIELDS,
      items: [],
      currentPage: 1,
      pageSize: 25,
      loading: false,
      testing: false,
      saving: false,
      deletingKey: '',
      errorMessage: '',
      connectionMessage: '',
      dateFilter: {
        fromDate: '',
        toDate: ''
      },
      filterError: '',
      showForm: false,
      form: createEmptyForm(),
      formError: '',
      editingItem: null
    }
  },

  computed: {
    // Xác định tiêu đề form theo chế độ thêm hoặc sửa.
    formTitle() {
      return this.editingItem === null ? 'Thêm thực đơn' : 'Sửa thực đơn'
    },

    // Tính tổng số trang dữ liệu.
    totalPages() {
      return Math.ceil(this.items.length / this.pageSize) || 1
    },

    // Lấy dữ liệu của trang hiện tại.
    pagedItems() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.items.slice(start, start + this.pageSize)
    },

    // Kiểm tra người dùng có lọc ngày không.
    hasDateFilter() {
      return Boolean(this.dateFilter.fromDate || this.dateFilter.toDate)
    }
  },

  // Tải dữ liệu khi mở màn hình.
  mounted() {
    this.loadData()
  },

  methods: {
    // Kiểm tra kết nối Kinetic.
    async testConnection() {
      try {
        this.testing = true
        this.connectionMessage = ''
        this.errorMessage = ''
        await testKineticConnection()
        this.connectionMessage = 'Kết nối Kinetic thành công.'
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.testing = false
      }
    },

    // Tải danh sách thực đơn từ API.
    async loadData() {
      try {
        this.loading = true
        this.connectionMessage = ''
        this.errorMessage = ''
        this.items = await getDailyMenus(this.dateFilter)
        this.currentPage = Math.min(this.currentPage, this.totalPages)
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading = false
      }
    },

    // Tìm thực đơn theo khoảng ngày.
    searchByDate() {
      this.filterError = this.validateDateFilter()

      if (this.filterError) {
        return
      }

      this.currentPage = 1
      this.loadData()
    },

    // Xóa bộ lọc ngày và tải lại dữ liệu.
    clearDateFilter() {
      this.dateFilter = {
        fromDate: '',
        toDate: ''
      }
      this.filterError = ''
      this.currentPage = 1
      this.loadData()
    },

    // Kiểm tra tính hợp lệ của khoảng ngày.
    validateDateFilter() {
      if (
        this.dateFilter.fromDate &&
        this.dateFilter.toDate &&
        this.dateFilter.fromDate > this.dateFilter.toDate
      ) {
        return 'Từ ngày không được lớn hơn đến ngày.'
      }

      return ''
    },

    // Mở form thêm mới thực đơn.
    openAddForm() {
      this.form = createEmptyForm()
      this.formError = ''
      this.editingItem = null
      this.showForm = true
    },

    // Mở form sửa thực đơn đã chọn.
    openEditForm(item) {
      this.form = toForm(item)
      this.formError = ''
      this.editingItem = item
      this.showForm = true
    },

    // Đóng form và reset dữ liệu.
    cancelForm() {
      this.showForm = false
      this.form = createEmptyForm()
      this.formError = ''
      this.editingItem = null
    },

    // Kiểm tra dữ liệu trước khi lưu.
    validateForm() {
      if (!this.form.UD10_ShortChar01) {
        return 'Vui lòng nhập thứ.'
      }

      if (!this.form.UD10_Date01) {
        return 'Vui lòng nhập ngày.'
      }

      const duplicateDate = this.items.some((item) => {
        return (item.UD10_Date01 || '').slice(0, 10) === this.form.UD10_Date01 &&
          item.Key1 !== (this.editingItem && this.editingItem.Key1)
      })

      if (duplicateDate) {
        return 'Ngày này đã có thực đơn.'
      }

      return ''
    },

    // Lưu thêm mới hoặc cập nhật thực đơn.
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

    // Xóa thực đơn đã chọn.
    async deleteItem(item) {
      const date = this.formatDate(item.UD10_Date01)

      if (!window.confirm(`Bạn có chắc muốn xóa thực đơn ngày ${date}?`)) {
        return
      }

      try {
        this.deletingKey = item.Key1
        this.errorMessage = ''
        await deleteDailyMenu(item)

        if (this.editingItem && this.editingItem.Key1 === item.Key1) {
          this.cancelForm()
        }

        await this.loadData()
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.deletingKey = ''
      }
    },

    // Định dạng ngày yyyy-mm-dd sang dd/mm/yyyy.
    formatDate(value) {
      if (!value) {
        return ''
      }

      const [year, month, day] = value.slice(0, 10).split('-')
      return `${day}/${month}/${year}`
    },

    // Cập nhật trang hiện tại.
    handlePageChange(page) {
      this.currentPage = page
    },

    // Cập nhật số dòng mỗi trang.
    handlePageSizeChange(size) {
      this.pageSize = size
      this.currentPage = 1
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

.page-header p {
  margin: 6px 0 0;
  color: #6b7280;
}

.header-actions,
.form-actions,
.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 220px));
  align-items: end;
  gap: 12px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
}

.filter-actions {
  align-items: center;
}

.menu-form {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #d7d7d7;
  border-radius: 6px;
  background: #ffffff;
}

.menu-form h2 {
  margin: 0 0 12px;
  font-size: 20px;
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
  font-weight: 700;
}

.form-field input {
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
}

.form-field strong,
.form-error,
.error-message {
  color: #dc2626;
}

.form-actions {
  margin-top: 16px;
}

.primary-button,
.secondary-button,
.edit-button,
.delete-button {
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

.edit-button {
  background: #ffc107;
  color: #000000;
}

.delete-button {
  background: #dc3545;
  color: #ffffff;
}

.message,
.success-message,
.error-message,
.form-error {
  margin: 12px 0;
  font-weight: 700;
}

.success-message {
  color: #047857;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  min-width: 1200px;
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

.action-cell {
  text-align: center;
  white-space: nowrap;
}

.action-cell button + button {
  margin-left: 6px;
}

.no-data {
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
}
</style>
