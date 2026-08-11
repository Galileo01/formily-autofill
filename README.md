# FormilyAutofill

FormilyAutofill 是一个基于 WXT、React 和 Arco Design 的浏览器扩展。它在 Chrome DevTools 中展示页面上的 Formily 表单结构，并支持基于完整表单图的 AI 辅助填充和本地 Smoke 回填。

> 这是面向 Formily 开发与测试场景的开发者工具。请勿将未经授权的生产数据发送给第三方 AI 服务。

## 功能

- 自动发现页面中的 Formily 表单实例，并在 DevTools 的 **FormilyAutofill** 面板中展示。
- 按表单实例查看和筛选字段树，并查看节点 JSON 信息。
- 复制当前表单的完整 FormGraph。
- 输入自然语言要求，由 OpenAI-compatible 服务生成 `FillOperation[]`（路径、JSON 值和可选生成原因）。
- 在写入前预览操作；确认后逐路径调用 Formily 回填，并展示页面实际返回的成功、失败与读回结果。
- 提供不依赖网络和模型的 **本地 Smoke** 操作，用于验证页面注入与回填链路。
- 支持自定义 AI 服务；API Key 默认只保存在当前浏览器会话中，只有显式勾选后才会持久化。

## 回填流程

```text
当前完整 FormGraph + 自然语言指令
  -> AI 服务或本地 Smoke 生成 FillOperation[]
  -> DevTools 预览并确认
  -> Formily setValuesIn(path, value)
  -> 每条操作的真实执行结果
```

扩展优先使用 Formily v2 的 `form.setValuesIn`，并保留旧版 `setFieldValue` 兼容回退。对于对象、数组和 ArrayTable，应以容器路径写入完整 JSON 值，而非逐个写入不可编辑的展示单元格。

## 环境要求

- Node.js `>= 20`（建议使用 Node.js 22）
- pnpm
- Chrome 或其他 Chromium 浏览器的开发者模式

## 快速开始

安装依赖：

```bash
pnpm install
```

启动 Chrome 开发版扩展：

```bash
pnpm dev
```

WXT 会启动开发环境。也可以在 Chrome 的 `chrome://extensions/` 打开开发者模式，并从 `.output/chrome-mv3-dev/` 加载未打包的扩展。

随后打开一个使用 Formily 的页面，打开浏览器开发者工具，选择 **FormilyAutofill** 面板即可查看表单。

Firefox 开发与构建命令：

```bash
pnpm dev:firefox
pnpm build:firefox
```

## 使用 AI 填充

1. 在左侧选择要操作的 Formily 表单。
2. 在“AI 辅助填充”中输入数据要求，例如“生成三条员工数据，第一条是管理员”。
3. 阅读数据提示并确认：AI 请求会发送当前完整 FormGraph，其中可能包括当前值、初始值和字段配置。
4. 配置内置或自定义服务，点击“使用 AI 生成”。
5. 核对返回的 `FillOperation[]` 预览，再点击“确认填充到表单”。
6. 查看逐路径的真实执行结果；失败项会保留，便于修正后重试。

若只想排查扩展与页面 Formily Hook 的连接，不想发送网络请求，点击“本地 Smoke”。

### AI 服务配置

AI 请求由扩展的 Background Service Worker 发出，DevTools 面板不会在运行时消息中传递 API Key。

- **内置服务（开发期 PoC）**：在 `.env.local` 或 `.env` 中设置开发环境变量。该 Key 会被打进开发扩展，仅可使用短期、受控凭证。
- **内置服务（生产形态）**：需要配置扩展自有 Gateway；扩展不保存真实上游模型密钥。
- **自定义服务**：填写 OpenAI-compatible Base URL、API Key 和模型。HTTPS 域名会在运行时申请访问权限；开发环境允许本地 HTTP。

开发期 OpenRouter 示例：

```dotenv
WXT_AI_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=development-only-openrouter-key
WXT_AI_MODEL=openrouter/free
```

Base URL 和模型保存在 `chrome.storage.local`。自定义 API Key 默认保存至 `chrome.storage.session`，关闭浏览器后失效；勾选“记住 API Key”才会写入本地持久化存储。相关存储仅限受信任的扩展上下文访问。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Chrome 开发环境与热更新 |
| `pnpm dev:firefox` | 启动 Firefox 开发环境 |
| `pnpm build` | 构建 Chrome 生产包 |
| `pnpm build:firefox` | 构建 Firefox 生产包 |
| `pnpm zip` | 生成 Chrome 扩展 zip 包 |
| `pnpm zip:firefox` | 生成 Firefox 扩展 zip 包 |
| `pnpm compile` | TypeScript 类型检查 |
| `pnpm test` | 运行 Vitest 测试 |

## 项目结构

```text
src/
  entrypoints/
    injected.ts          页面 Hook：采集 FormGraph、执行回填
    content.ts           页面消息转发
    background.ts        DevTools 端口和 AI 请求代理
    devtools/            注册自定义 DevTools 面板
    devtools-panel/      DevTools React 应用
  components/
    left-panel/          表单实例与字段树
    right-panel/         节点信息与 AI 填充入口
    ai-fill/             配置、预览、执行结果
  ai/                    协议、解析、权限、Smoke 与回填表达式
  utils/                 树与本地存储工具
tests/
  fixtures/form-graphs/  脱敏的 FormGraph 回归样例
  integration/           AI 请求到 Formily 回填的集成测试
```

## 验证范围与限制

- 测试覆盖 Prompt/响应解析、路径校验、Smoke、回填表达式、权限和存储，以及登录、复杂字段和 ArrayTable 的集成链路。
- AI 返回必须是可校验的路径操作；未知、重复或不可写路径会在写入前被拒绝。
- 当前重点验证 JSON 传输与按路径回填。富文本、上传组件、自定义组件和复杂递归数组的业务语义仍可能需要组件适配与真实页面验证。
- Chrome DevTools 通过 `inspectedWindow.eval` 调用真实页面 Hook 的端到端场景，仍需要在目标 Formily 页面上继续手工验证。
- 生产内置 Gateway 的鉴权、限流、配额、日志脱敏与滥用控制属于服务端职责，不由本仓库实现。

## 致谢

- [Formily DevTools](https://github.com/alibaba/formily/tree/formily_next/devtools/chrome-extension)
