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
import Login from './components/login/Login'
import SideBar from './components/sidebar/SideBar.vue'
import { sidebarWidth } from './components/sidebar/state'

export default {
  name: 'App',
  components: {
    Login,
    SideBar
  },

  data() {
    return {
      isLoggedIn: false
    }
  },

  setup() {
    return {
      sidebarWidth
    }
  },

  methods: {
    handleLoginSuccess() {
      this.isLoggedIn = true
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

body {
  margin: 0;
  background: #f8fafc;
}

.app-shell {
  min-height: 100vh;
}

.app-content {
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}
</style>
