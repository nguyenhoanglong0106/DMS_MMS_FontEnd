const { defineConfig } = require('@vue/cli-service')
const kineticProxyTarget = (process.env.VUE_APP_KINETIC_PROXY_TARGET || '').trim()

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: kineticProxyTarget
    ? {
        proxy: {
          '/kinetic-api': {
            target: kineticProxyTarget,
            changeOrigin: true,
            secure: false,
            pathRewrite: {
              '^/kinetic-api': ''
            }
          }
        }
      }
    : undefined
})
