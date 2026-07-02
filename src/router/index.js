import { createRouter, createWebHistory } from 'vue-router'
import MenuDaily from '@/components/view/MenuDaily.vue'
import ImportMenuDaily from '@/components/view/ImportMenuDaily.vue'
import ImportDomain from '@/components/view/ImportDomain.vue'
import ImportInternet from '@/components/view/ImportInternet.vue'
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
    name: 'Import Daily Menu',
    component: ImportMenuDaily
  },
  {
    path: '/importdomain',
    name: 'Import Domain',
    component: ImportDomain
  },
  {
    path: '/importinternet',
    name: 'Import Internet',
    component: ImportInternet
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
