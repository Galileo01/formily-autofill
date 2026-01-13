export default defineContentScript({
  matches: ['*://*/*'],
  // 在 css 之后、构建任何其他脚本之前注入 , 保证Hook在formily 创建时可访问
  runAt: 'document_start',
  main() {
    // 注入hook 脚本
    injectScript('/injected.js', {
      keepInDom: true,
    })

    // 转发来自 injected 脚本的消息到 background
    window.addEventListener(
      'message',
      (event) => {
        chrome.runtime.sendMessage(event.data)
      },
      false
    )
  },
})
