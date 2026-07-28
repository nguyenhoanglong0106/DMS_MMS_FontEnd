import { createRouter, createWebHistory } from 'vue-router'
import HomeDashboardView from '@/views/HomeDashboardView.vue'
import MachineDetailView from '@/views/machines/MachineDetailView.vue'
import MachineMonitoringView from '@/views/machines/MachineMonitoringView.vue'
import MachineRegistrationView from '@/views/machines/MachineRegistrationView.vue'
import MachineStatusHistoryView from '@/views/machines/MachineStatusHistoryView.vue'
import MachineStatusTimelineView from '@/views/machines/MachineStatusTimelineView.vue'
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
    component: HomeDashboardView
  },
  {
    path: '/machines',
    name: 'Machine Registration',
    component: MachineRegistrationView
  },
  {
    path: '/machines/monitoring',
    name: 'Machine Monitoring',
    component: MachineMonitoringView
  },
  {
    path: '/machines/status-timeline',
    name: 'Machine Status Timeline',
    component: MachineStatusTimelineView
  },
  {
    path: '/machines/:id',
    name: 'Machine Detail',
    component: MachineDetailView
  },
  {
    path: '/machines/:id/status-history',
    name: 'Machine Status History',
    component: MachineStatusHistoryView
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
    props: {
      section: 'locations'
    }
  },
  {
    path: '/settings/statuses',
    name: 'Settings Statuses',
    component: SettingsMasterDataView,
    props: {
      section: 'statuses'
    }
  },
  {
    path: '/settings/theme',
    name: 'Settings Theme',
    component: ThemeSettingsView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
