import { defineConfig } from 'wxt'
import { vitePluginForArco } from '@arco-plugins/vite-react'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [vitePluginForArco(), tailwindcss()],
  }),
  runner: {
    startUrls: [
      'https://formilyjs.org/zh-CN/guide/scenes/login-register',
      'https://formilyjs.org/zh-CN/guide/advanced/calculator',
    ],
    // 仅 firefox 支持
    openDevtools: true,
    //  chromium
    chromiumArgs: ['--auto-open-devtools-for-tabs'],
  },
  manifest: {
    // inject.js 注入脚本 必须手动 加入到 web_accessible_resources
    web_accessible_resources: [
      {
        matches: ['*://*/*'],
        resources: ['/injected.js'],
      },
    ],
    permissions: ['storage', 'clipboardWrite', 'clipboardRead'],
  },
})
