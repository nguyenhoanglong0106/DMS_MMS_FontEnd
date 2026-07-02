import { createRouter, createWebHistory } from 'vue-router'
import MenuDaily from '@/components/view/MenuDaily.vue'
import ImportMenuDaily from '@/components/view/ImportMenuDaily.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/dailyMenu',
    name: 'Daily Menu',
    component: MenuDaily
  },
  {
    path: '/importExcel',
    name: 'Import Excel',
    component: ImportMenuDaily
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
