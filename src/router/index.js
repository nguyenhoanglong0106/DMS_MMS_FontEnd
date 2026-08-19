// Định nghĩa toàn bộ route của ứng dụng. Dùng history mode nên server phải
// fallback mọi đường dẫn không khớp file tĩnh về index.html khi deploy.
import { createRouter, createWebHistory } from 'vue-router'
import HomeDashboardView from '@/views/HomeDashboardView.vue'
import MachineDetailView from '@/views/machines/MachineDetailView.vue'
import MachineMonitoringView from '@/views/machines/MachineMonitoringView.vue'
import MachineRegistrationView from '@/views/machines/MachineRegistrationView.vue'
import MachineStatusHistoryView from '@/views/machines/MachineStatusHistoryView.vue'
import MachineStatusTimelineView from '@/views/machines/MachineStatusTimelineView.vue'
import KhsxServiceView from '@/views/production/KhsxServiceView.vue'
import ProductionPlanView from '@/views/production/ProductionPlanView.vue'
import SettingsMasterDataView from '@/views/settings/SettingsMasterDataView.vue'
import ThemeSettingsView from '@/views/settings/ThemeSettingsView.vue'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeDashboardView,
    meta: {
      tabTitle: 'Trang chủ',
      icon: 'fas fa-home',
      fixedTab: true
    }
  },
  {
    path: '/machines',
    name: 'Machine Registration',
    component: MachineRegistrationView,
    meta: {
      tabTitle: 'Đăng ký máy',
      icon: 'fas fa-industry'
    }
  },
  {
    path: '/machines/monitoring',
    name: 'Machine Monitoring',
    component: MachineMonitoringView,
    meta: {
      tabTitle: 'Giám sát máy',
      icon: 'fas fa-chart-line'
    }
  },
  {
    path: '/machines/status-timeline',
    name: 'Machine Status Timeline',
    component: MachineStatusTimelineView,
    meta: {
      tabTitle: 'Timeline',
      icon: 'fas fa-history'
    }
  },
  {
    path: '/machines/:id',
    name: 'Machine Detail',
    component: MachineDetailView,
    meta: {
      tabTitle: 'Chi tiết máy',
      icon: 'fas fa-microchip',
      tabKey: 'machine-detail',
      cacheKey: 'machine-detail'
    }
  },
  {
    path: '/machines/:id/status-history',
    name: 'Machine Status History',
    component: MachineStatusHistoryView,
    meta: {
      tabTitle: 'Lịch sử trạng thái',
      icon: 'fas fa-clipboard-list',
      tabKey: 'machine-status-history',
      cacheKey: 'machine-status-history'
    }
  },
  {
    path: '/khsx',
    name: 'Production Plan',
    component: ProductionPlanView,
    meta: {
      tabTitle: 'Kế hoạch sản xuất',
      icon: 'fas fa-calendar-check'
    }
  },
  {
    path: '/khsx/service',
    name: 'Khsx Service',
    component: KhsxServiceView,
    meta: {
      tabTitle: 'Cấu hình',
      icon: 'fas fa-clock'
    }
  },
  {
    path: '/settings',
    redirect: '/settings/locations'
  },
  {
    path: '/settings/master-data',
    redirect: '/settings/locations'
  },
  {
    path: '/settings/locations',
    name: 'Settings Locations',
    component: SettingsMasterDataView,
    meta: {
      tabTitle: 'Location',
      icon: 'fas fa-map-marker-alt'
    },
    props: {
      section: 'locations'
    }
  },
  {
    path: '/settings/statuses',
    name: 'Settings Statuses',
    component: SettingsMasterDataView,
    meta: {
      tabTitle: 'Trạng thái',
      icon: 'fas fa-tags'
    },
    props: {
      section: 'statuses'
    }
  },
  {
    path: '/settings/theme',
    name: 'Settings Theme',
    component: ThemeSettingsView,
    meta: {
      tabTitle: 'Theme',
      icon: 'fas fa-palette'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
