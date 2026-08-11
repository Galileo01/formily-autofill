import { defineConfig } from 'wxt'
import { vitePluginForArco } from '@arco-plugins/vite-react'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    envPrefix: ['WXT_', 'OPENROUTER_'],
    plugins: [vitePluginForArco(), tailwindcss()],
  }),
  webExt: {
    startUrls: [
      'https://formilyjs.org/zh-CN/guide/scenes/login-register',
      'https://formilyjs.org/zh-CN/guide/advanced/calculator',
    ],
    // 仅 firefox 支持
    openDevtools: true,
    //  chromium
    chromiumArgs: ['--auto-open-devtools-for-tabs'],
  },
  manifest: ({ manifestVersion }) => ({
    // inject.js 注入脚本 必须手动 加入到 web_accessible_resources
    web_accessible_resources: [
      {
        matches: ['*://*/*'],
        resources: ['/injected.js'],
      },
    ],
    permissions: ['storage', 'clipboardWrite', 'clipboardRead'],
    host_permissions: ['https://openrouter.ai/*'],
    ...(manifestVersion === 3
      ? { optional_host_permissions: ['https://*/*', 'http://*/*'] }
      : { optional_permissions: ['https://*/*', 'http://*/*'] }),
  }),
})
