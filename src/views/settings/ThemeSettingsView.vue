<template>
  <main class="settings-page theme-page">
    <header class="page-header">
      <div>
        <h1>Cài đặt theme</h1>
        <p>Thiết lập màu giao diện MMS.</p>
      </div>
      <button type="button" class="reload-button secondary" @click="resetTheme">
        <i class="fas fa-undo" aria-hidden="true"></i>
        <span>Mặc định</span>
      </button>
    </header>

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section class="theme-layout">
      <section class="theme-panel">
        <header>
          <h2>Preset</h2>
        </header>

        <div class="preset-list">
          <button
            v-for="preset in THEME_PRESETS"
            :key="preset.id"
            type="button"
            class="preset-button"
            :class="{ active: theme.id === preset.id }"
            @click="selectPreset(preset)"
          >
            <span class="preset-swatches" aria-hidden="true">
              <span :style="{ backgroundColor: preset.values.sidebarBg }"></span>
              <span :style="{ backgroundColor: preset.values.primaryColor }"></span>
              <span :style="{ backgroundColor: preset.values.surfaceBg }"></span>
            </span>
            <span>{{ preset.name }}</span>
          </button>
        </div>
      </section>

      <form class="theme-panel" @submit.prevent="saveTheme">
        <header>
          <h2>Màu giao diện</h2>
        </header>

        <div class="color-grid">
          <label v-for="field in THEME_FIELDS" :key="field.key">
            {{ field.label }}
            <span class="color-input">
              <input v-model="theme.values[field.key]" type="color" @input="previewTheme" />
              <input v-model.trim="theme.values[field.key]" type="text" @input="previewTheme" />
            </span>
          </label>
        </div>

        <footer>
          <button type="button" class="secondary" @click="loadSavedTheme">
            <i class="fas fa-times" aria-hidden="true"></i>
            <span>Hủy</span>
          </button>
          <button type="submit">
            <i class="fas fa-save" aria-hidden="true"></i>
            <span>Lưu theme</span>
          </button>
        </footer>
      </form>
    </section>

    <section class="preview-panel">
      <header>
        <h2>Preview</h2>
        <span>Dashboard</span>
      </header>

      <div class="preview-content">
        <aside>
          <strong>MMS</strong>
          <span>Thiết bị máy</span>
          <span>Setting</span>
        </aside>
        <div class="preview-main">
          <div class="preview-toolbar">
            <strong>Giám sát máy</strong>
            <button type="button">Reload</button>
          </div>
          <div class="preview-row">
            <article>
              <span>Tổng máy</span>
              <strong>24</strong>
            </article>
            <article>
              <span>Online</span>
              <strong>18</strong>
            </article>
            <article>
              <span>Offline</span>
              <strong>6</strong>
            </article>
          </div>
          <div class="preview-table">
            <span>Mã máy</span>
            <span>Trạng thái</span>
            <span>Tín hiệu cuối</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import {
  applyTheme,
  defaultThemeSettings,
  readThemeSettings,
  resetThemeSettings,
  saveThemeSettings,
  THEME_FIELDS,
  THEME_PRESETS
} from '@/theme/theme'

const theme = reactive(readThemeSettings())
const message = ref('')
const error = ref('')
let messageTimer = null

function cloneTheme(nextTheme) {
  return JSON.parse(JSON.stringify(nextTheme))
}

function replaceTheme(nextTheme) {
  const cloned = cloneTheme(nextTheme)

  theme.id = cloned.id
  theme.name = cloned.name
  theme.values = cloned.values
}

function showMessage(text) {
  message.value = text

  if (messageTimer) {
    clearTimeout(messageTimer)
  }

  messageTimer = setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, 2500)
}

function selectPreset(preset) {
  error.value = ''
  replaceTheme({
    id: preset.id,
    name: preset.name,
    values: preset.values
  })
  applyTheme(theme)
}

function invalidColorField() {
  return THEME_FIELDS.find((field) => !/^#[0-9A-Fa-f]{6}$/.test(theme.values[field.key] || ''))
}

function previewTheme() {
  const invalidField = invalidColorField()

  if (invalidField) {
    error.value = `${invalidField.label} phải có dạng #RRGGBB.`
    return
  }

  error.value = ''
  theme.id = 'custom'
  theme.name = 'Custom'
  applyTheme(theme)
}

function saveTheme() {
  const invalidField = invalidColorField()

  if (invalidField) {
    error.value = `${invalidField.label} phải có dạng #RRGGBB.`
    return
  }

  error.value = ''
  replaceTheme(saveThemeSettings(theme))
  showMessage('Đã lưu theme.')
}

function loadSavedTheme() {
  error.value = ''
  replaceTheme(readThemeSettings())
  applyTheme(theme)
}

function resetTheme() {
  error.value = ''
  replaceTheme(resetThemeSettings() || defaultThemeSettings())
  showMessage('Đã đưa theme về mặc định.')
}
</script>

<style scoped>
.theme-page {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 100vh;
  padding: 28px;
  background: var(--app-bg);
  color: var(--text-color);
}

.page-header,
.theme-panel header,
.theme-panel footer,
.preview-panel header,
.preview-toolbar,
.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  margin-bottom: 6px;
  font-size: 28px;
  line-height: 1.2;
}

h2 {
  font-size: 18px;
  line-height: 1.2;
}

.page-header p,
.preview-panel header span,
.preview-row span {
  color: var(--muted-color);
}

button {
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  background: var(--primary-color);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
}

.reload-button,
.theme-panel footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
}

.secondary {
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
}

.theme-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.theme-panel,
.preview-panel {
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
}

.theme-panel {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.preset-list {
  display: grid;
  gap: 10px;
}

.preset-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-height: 48px;
  border-color: var(--border-color);
  background: var(--surface-bg);
  color: var(--text-color);
  text-align: left;
}

.preset-button.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.preset-swatches {
  display: inline-flex;
  overflow: hidden;
  width: 52px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.preset-swatches span {
  flex: 1;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 700;
}

.color-input {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
}

input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--text-color);
}

input[type='color'] {
  padding: 3px;
}

input[type='text'] {
  padding: 0 12px;
}

.message {
  box-sizing: border-box;
  width: 100%;
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--success-bg);
  color: var(--success-text);
}

.error {
  box-sizing: border-box;
  width: 100%;
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--error-bg);
  color: var(--error-text);
}

.preview-panel header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.preview-content {
  display: grid;
  grid-template-columns: 180px 1fr;
  min-height: 230px;
}

.preview-content aside {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 18px;
  background: var(--sidebar-bg-color);
  color: #ffffff;
}

.preview-content aside strong {
  margin-bottom: 8px;
  font-size: 24px;
}

.preview-content aside span {
  border-radius: 6px;
  padding: 10px;
  background: var(--sidebar-item-hover);
  font-weight: 800;
}

.preview-main {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 16px;
  background: var(--app-bg);
}

.preview-toolbar,
.preview-row article,
.preview-table {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-bg);
}

.preview-toolbar {
  padding: 12px;
}

.preview-toolbar button {
  height: 34px;
  padding: 0 12px;
}

.preview-row {
  align-items: stretch;
}

.preview-row article {
  display: grid;
  gap: 8px;
  flex: 1;
  padding: 12px;
}

.preview-row strong {
  font-size: 24px;
}

.preview-table {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
}

.preview-table span {
  padding: 12px;
  background: var(--table-header-bg);
  color: var(--text-color);
  font-weight: 800;
}

@media (max-width: 900px) {
  .theme-page {
    padding: 18px;
  }

  .page-header,
  .theme-layout,
  .preview-content {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .preview-row {
    flex-direction: column;
  }
}
</style>
