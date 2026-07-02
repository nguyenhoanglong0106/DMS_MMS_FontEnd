<template>
  <div v-if="totalItems > 0" class="pagination-wrapper">
    <div class="page-size-control">
      <label>Số dòng:</label>

      <input
        type="number"
        min="1"
        :value="displayedPageSize"
        @change="changePageSize"
      />

      <span>/ {{ totalItems }}</span>
    </div>

    <div class="pagination">
      <button @click="changePage(1)" :disabled="currentPage === 1">
        &lt;&lt;
      </button>

      <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">
        &lt;
      </button>

      <span class="page-info">
           {{ currentPage }} / {{ totalPages }}
      </span>

      <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">
        &gt;
      </button>

      <button @click="changePage(totalPages)" :disabled="currentPage === totalPages">
        &gt;&gt;
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaginationControl',

  props: {
    totalItems: {
      type: Number,
      required: true
    },

    currentPage: {
      type: Number,
      required: true
    },

    pageSize: {
      type: Number,
      default: 25
    }
  },

  computed: {
    displayedPageSize() {
      return Math.min(this.pageSize, this.totalItems)
    },

    totalPages() {
      return Math.ceil(this.totalItems / this.pageSize) || 1
    }
  },

  methods: {
    changePage(page) {
      if (page < 1) page = 1
      if (page > this.totalPages) page = this.totalPages

      this.$emit('page-change', page)
    },

    changePageSize(event) {
      let newSize = Number(event.target.value)

      if (!newSize || newSize < 1) {
        newSize = 25
      }

      this.$emit('page-size-change', newSize)
      this.$emit('page-change', 1)
    }
  }
}
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;

  position: sticky;
  bottom: 0;

  background: #ffffff;
  padding: 12px 0;
  border-top: 1px solid #ddd;
  margin-top: 12px;
  z-index: 10;
}

.page-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-control input {
  width: 70px;
  padding: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination button {
  min-width: 36px;
  padding: 6px 10px;
  border: 1px solid #007bff;
  background: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  border-color: #ccc;
  color: #aaa;
  cursor: not-allowed;
  background: #f5f5f5;
}

.page-info {
  padding: 0 8px;
}
</style>
