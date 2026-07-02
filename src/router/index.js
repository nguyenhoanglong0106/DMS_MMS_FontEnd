import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/components/view/HomePage.vue'
import Dashboard from '@/components/view/Dashboard.vue'
import SqlConnectPage from '@/components/view/SqlConnectPage.vue'

const routes = [

  {
    path: '/homepage',
    name: 'HomePage',
    component: HomePage
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
   {
    path: '/SqlConnectPage',
    name: 'SqlConnectPage',
    component: SqlConnectPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router