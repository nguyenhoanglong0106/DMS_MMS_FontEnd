import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initTheme } from './theme/theme'

// Áp theme trước khi mount app để tránh nháy sáng/tối lúc tải trang.
initTheme()
createApp(App).use(createPinia()).use(router).mount('#app')
