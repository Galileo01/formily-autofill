import { OPENROUTER_FREE_BASE_URL } from './config'

const isLocalDevelopmentHost = (url: URL) =>
  import.meta.env.DEV && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)

export const getAIHostPermissionPattern = (baseUrl: string) => {
  let url: URL

  try {
    url = new URL(baseUrl.trim())
  } catch {
    throw new Error('Base URL 不是有效的 URL')
  }

  if (url.protocol !== 'https:' && !isLocalDevelopmentHost(url)) {
    throw new Error('自定义 AI 服务必须使用 HTTPS；开发环境仅允许本机 HTTP')
  }

  return `${url.origin}/*`
}

export const ensureAIHostPermission = async (baseUrl: string) => {
  const origin = getAIHostPermissionPattern(baseUrl)
  const openRouterOrigin = getAIHostPermissionPattern(OPENROUTER_FREE_BASE_URL)

  if (origin === openRouterOrigin) return true

  return chrome.permissions.request({ origins: [origin] })
}
