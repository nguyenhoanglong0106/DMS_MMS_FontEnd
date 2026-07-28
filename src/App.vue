<template>
  <Login v-if="!isLoggedIn" @login-success="handleLoginSuccess" />

  <div v-else class="app-shell">
    <SideBar />

    <main class="app-content" :style="{ marginLeft: sidebarWidth }">
      <router-view />
    </main>
  </div>
</template>

<script>
import Login from './components/login/Login.vue'
import SideBar from './components/sidebar/SideBar.vue'
import { sidebarWidth } from './components/sidebar/state'

export default {
  name: 'App',
  components: {
    Login,
    SideBar
  },

  // Khởi tạo trạng thái đăng nhập.
  data() {
    return {
      isLoggedIn: false
    }
  },

  // Cung cấp chiều rộng sidebar cho layout.
  setup() {
    return {
      sidebarWidth
    }
  },

  methods: {
    // Đánh dấu người dùng đã đăng nhập.
    handleLoginSuccess() {
      this.isLoggedIn = true
    }
  }
}
</script>

<style>
:root {
  --font-sans: "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;
  --app-bg: #f8fafc;
  --surface-bg: #ffffff;
  --surface-muted: #f8fafc;
  --text-color: #111827;
  --muted-color: #64748b;
  --primary-color: #0f62b4;
  --primary-hover-color: #0b559f;
  --border-color: #d1d5db;
  --sidebar-bg-color: #1f7a4d;
  --sidebar-item-hover: #2f9e63;
  --sidebar-item-active: #145c38;
  --table-header-bg: #f8fafc;
  --success-bg: #dcfce7;
  --success-text: #166534;
  --error-bg: #fee2e2;
  --error-text: #991b1b;
}

#app {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  color: var(--text-color);
}

#app *:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not([class^='fa-']):not([class*=' fa-']) {
  font-family: var(--font-sans) !important;
}

#app .fa,
#app .fas,
#app .far,
#app .fab,
#app .fal,
#app .fad,
#app [class^='fa-'],
#app [class*=' fa-'] {
  font-family: "Font Awesome 5 Free" !important;
}

#app .fab {
  font-family: "Font Awesome 5 Brands" !important;
}

html,
body {
  margin: 0;
  background: var(--app-bg);
  font-family: var(--font-sans);
}

button,
input,
select,
textarea {
  font-family: var(--font-sans) !important;
  font-size: 14px;
  letter-spacing: 0;
}

button {
  min-width: 0;
  line-height: 1.25;
  text-align: center;
  text-wrap: balance;
  white-space: nowrap;
  font-weight: 700 !important;
  -webkit-font-smoothing: antialiased;
}

button i,
a.action-icon i,
.menu-left i,
.submenu-item i,
.flyout-item i {
  font-family: "Font Awesome 5 Free" !important;
  font-style: normal;
  line-height: 1;
  flex: 0 0 auto;
}

button span {
  min-width: 0;
  line-height: 1.25;
}

input,
select,
textarea {
  background: var(--surface-bg) !important;
  border-color: var(--border-color) !important;
  color: var(--text-color) !important;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--primary-color) !important;
  outline-color: color-mix(in srgb, var(--primary-color) 18%, transparent) !important;
}

:where(
  .add-machine-button,
  .reload-button:not(.secondary),
  .filters button,
  .master-form footer button:not(.secondary),
  .modal footer button:not(.secondary),
  .theme-panel footer button:not(.secondary),
  a.action-icon.view
) {
  border-color: var(--primary-color) !important;
  background: var(--primary-color) !important;
  color: #ffffff !important;
}

:where(
  .add-machine-button,
  .reload-button:not(.secondary),
  .filters button,
  .master-form footer button:not(.secondary),
  .modal footer button:not(.secondary),
  .theme-panel footer button:not(.secondary)
):hover {
  background: var(--primary-hover-color) !important;
}

:where(
  .machine-page,
  .monitor-page,
  .home-page,
  .detail-page,
  .timeline-page,
  .history-page,
  .settings-page
) {
  background: var(--app-bg) !important;
  color: var(--text-color) !important;
}

:where(
  .table-shell,
  .machine-list-panel,
  .machine-card,
  .panel,
  .timeline-panel,
  .event-list,
  .table-panel,
  .master-form,
  .modal,
  .dialog,
  table
) {
  background: var(--surface-bg) !important;
  color: var(--text-color) !important;
}

th {
  background: var(--table-header-bg) !important;
  color: var(--text-color) !important;
}

td,
th,
.table-shell,
  .machine-list-panel,
  .panel,
.timeline-panel,
.event-list,
.table-panel,
.master-form,
.machine-card,
.modal,
.dialog {
  border-color: var(--border-color) !important;
}

:where(p, dt, .empty, .page-header p, .list-toolbar span, .table-panel header span) {
  color: var(--muted-color) !important;
}

:where(.code, a:not(.menu-parent):not(.submenu-item):not(.flyout-item):not(.action-icon)) {
  color: var(--primary-color) !important;
}

.message {
  background: var(--success-bg) !important;
  color: var(--success-text) !important;
}

.error {
  background: var(--error-bg) !important;
  color: var(--error-text) !important;
}

.app-shell {
  min-height: 100vh;
  background: var(--app-bg);
}

.app-content {
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}
</style>
