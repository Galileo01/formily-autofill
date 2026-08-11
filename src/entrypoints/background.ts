import { requestFillOperations } from '@/ai/client'
import { AIFillMessageResponse, AIFillRequest, AI_FILL_REQUEST } from '@/ai/messages'
import { getAIConfig, restrictAIStorageAccess } from '@/utils/storage'

export default defineBackground(() => {
  const connections: Record<string, chrome.runtime.Port> = {}

  restrictAIStorageAccess().catch((error) => {
    console.warn('[FormilyAutofill] restrict AI storage failed:', error)
  })

  chrome.runtime.onConnect.addListener(function (port) {
    if (port.name === '@formily-autofill') {
      const extensionListener = function (message: any) {
        // 原始的连接事件不包含开发者工具网页的标签页标识符，
        // 所以我们需要显式发送它。
        if (message.name == 'init') {
          connections[message.tabId] = port
          return
        }
        // 其他消息的处理
      }

      // 监听开发者工具网页发来的消息
      port.onMessage.addListener(extensionListener)

      port.onDisconnect.addListener(function (port: any) {
        port.onMessage.removeListener(extensionListener)
        const tabs = Object.keys(connections)
        for (let i = 0, len = tabs.length; i < len; i++) {
          if (connections[tabs[i]] == port) {
            delete connections[tabs[i]]
            break
          }
        }
      })
    }
  })

  // 从内容脚本接收消息，并转发至当前
  // 标签页对应的开发者工具网页
  chrome.runtime.onMessage.addListener(function (
    request: unknown,
    sender,
    sendResponse: (response: AIFillMessageResponse) => void
  ) {
    if (request && typeof request === 'object' && (request as Partial<AIFillRequest>).type === AI_FILL_REQUEST) {
      if (sender.tab) {
        console.warn('[FormilyAutofill] rejected AI request from content script')
        return false
      }

      const aiRequest = request as AIFillRequest
      if (
        !aiRequest.formGraph ||
        typeof aiRequest.formGraph !== 'object' ||
        typeof aiRequest.instruction !== 'string'
      ) {
        sendResponse({ ok: false, error: 'AI 请求参数无效' })
        return false
      }

      getAIConfig()
        .then((config) => requestFillOperations(config, aiRequest.formGraph, aiRequest.instruction))
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'AI 请求失败',
          })
        )
      return true
    }

    // 来自内容脚本的消息应该已经设置 sender.tab
    if (sender.tab) {
      const tabId = sender.tab.id
      if (tabId && tabId in connections) {
        connections[tabId].postMessage(request)
      } else {
        console.info('连接列表中找不到该标签页。')
      }
    } else {
      console.info('sender.tab 未定义。')
    }
    return false
  })
})
