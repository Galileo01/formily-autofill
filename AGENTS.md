# AGENTS.md

本文档为在本仓库中工作的代码代理提供开发指导。

## 概述

这是一个基于 **WXT**（Web Extension Toolkit）+ **React 19** + **Arco Design Web React** 的 Chrome 扩展项目。它是 Formily devtools 扩展，提供对 Formily 表单的自动填充能力。仓库名为 `FormilyAutofill`。

## 项目结构

```
src/
  entrypoints/
    background.ts           -- 后台脚本（Service Worker）；管理端口连接并执行 AI 网络请求
    content.ts              -- 内容脚本；将 Hook 脚本注入页面，并将消息转发到后台
    injected.ts             -- 注入的 Hook 脚本，挂载到 window.__FORMILY_DEV_TOOLS_HOOK__；序列化表单数据并通过 postMessage 发送
    devtools/
      main.ts               -- 通过 browser.devtools.panels.create 创建 "FormilyAutofill" 自定义开发者工具面板
      App.tsx               -- 开发者工具面板的根 React 组件
    popup/
      main.tsx              -- 弹出窗口入口（最小占位符）
  components/
    devtools-panel.tsx       -- 顶层布局：LeftPanel + RightPanel 分屏视图
    left-panel/
      index.tsx             -- 每个 Formily 实例一个标签页的树形视图；支持树搜索/筛选
      index.module.less     -- 样式
    right-panel/
      index.tsx             -- 标签页："表单信息"（TreeInfo JSON 查看器）+ "AI 填充"
      tree-info.tsx         -- 使用 @microlink/react-json-view 的 JSON 树形查看器
      index.module.less     -- 样式
    ai-fill/
      index.tsx             -- 完整 FormGraph 的 AI/Smoke 生成、操作预览和真实回填结果
  ai/
    client.ts               -- OpenAI-compatible 请求、Prompt 构建和 FillOperation 解析
    config.ts               -- 开发期 OpenRouter、生产 Gateway 与自定义服务配置解析
    evaluate.ts             -- 构建 DevTools inspectedWindow 回填表达式
    server-config.ts        -- 仅供 Background 使用的内置凭证解析
    messages.ts             -- DevTools 面板与 Background 之间的 AI 请求协议
    permissions.ts          -- 自定义 AI 服务域名校验与运行时权限申请
    smoke.ts                -- 确定性的本地 Smoke 操作生成器
    types.ts                -- AI 配置、FillOperation 和回填结果协议
  utils/
    tree.ts                 -- createTree() 和 searchData() 工具函数，用于从 Formily 表单图中构建/筛选树形数据
```

## 架构（数据流）

1. **注入脚本**（`injected.ts`）将 `window.__FORMILY_DEV_TOOLS_HOOK__` 挂载到页面。它序列化 Formily 表单图，并通过 `window.postMessage` 发送 `{source, type, id, graph}` 消息。
2. **内容脚本**（`content.ts`）监听这些消息，并通过 `chrome.runtime.sendMessage` 将消息转发到**后台脚本**。
3. **后台脚本**（`background.ts`）维护标签页 ID 到端口连接的映射。它将内容脚本的消息转发到开发者工具面板端口，并在收到可信扩展页面的 AI 请求后读取配置、调用模型服务。
4. **开发者工具面板**（`devtools-panel/App.tsx`）通过 `chrome.runtime.connect` 连接到后台，发送 `init` 消息，然后监听 `update`/`install`/`uninstall` 消息，构建 `formDataSource` 状态。
5. **LeftPanel** 为每个 Formily 实例渲染一个标签页，每个标签页包含表单字段层次结构的树形视图（由 `utils/tree.ts` 中的 `createTree` 构建）。
6. **RightPanel** 显示所选节点的 JSON，或把当前完整 FormGraph 交给 AI/Smoke 生成器，预览 `FillOperation[]` 后逐路径回填。
7. **AI 配置**的 Base URL/模型存于 `storage.local`；自定义 API Key 默认存于 `storage.session`，只有用户明确选择后才持久化。DevTools 面板不在消息中传递 API Key。

## 常用命令

所有命令均在项目根目录（`/Users/bytedance/ownsapce/formily-autofill`）下运行。

| 命令                 | 描述                                                     |
| -------------------- | -------------------------------------------------------- |
| `pnpm dev`           | 启动开发服务器并启用热重载（自动打开 Chrome 并加载扩展） |
| `pnpm dev:firefox`   | 启动开发服务器，目标是 Firefox                           |
| `pnpm build`         | 构建生产版扩展                                           |
| `pnpm build:firefox` | 构建 Firefox 版                                          |
| `pnpm zip`           | 打包为 zip 文件（Chrome）                                |
| `pnpm zip:firefox`   | 打包为 zip 文件（Firefox）                               |
| `pnpm compile`       | 仅类型检查（`tsc --noEmit`）                             |
| `pnpm test`          | 运行 Vitest 单元测试                                     |
| `pnpm postinstall`   | 运行 `wxt prepare`（设置 `.wxt` 输出目录）               |

## 开发流程

1. 运行 `pnpm dev` 启动开发服务器。
2. 打开 `chrome://extensions/`，启用"开发者模式"，从 `.output/chrome-mv3-dev/` 加载未打包的扩展。
3. 访问一个包含 Formily 表单的页面（例如 `wxt.config.ts` 中的测试 URL）。
4. 打开 Chrome 开发者工具 —— "FormilyAutofill" 面板会作为自定义标签页出现。
5. 编辑源文件；WXT 会自动处理热重载。

## 关键配置文件

- **`wxt.config.ts`** -- WXT 配置：设置 `srcDir: 'src'`，使用 `@wxt-dev/module-react` 和 `@arco-plugins/vite-react`，配置 `web_accessible_resources`、存储/剪贴板权限、OpenRouter 固定域名权限、自定义 AI 可选域名权限和测试启动 URL。
- **`tsconfig.json`** -- 继承 `.wxt/tsconfig.json`，启用 `allowImportingTsExtensions` 和 `react-jsx` JSX 转换。
- **`eslint.config.ts`** -- ESLint 配置，使用 `typescript-eslint`、`eslint-plugin-react` 和 `eslint-plugin-prettier`。
- **`tailwind.config.ts`** -- Tailwind CSS 配置（通过 `@tailwindcss/vite` 使用）。

## 代码规范

### React 组件定义

- **使用函数式组件**：统一使用箭头函数定义组件，例如 `const ComponentName = (props: ComponentNameProps) => { ... }`。
- **内部解构 Props**：不要在函数参数签名处直接进行 inline 解构，应在组件函数体内部的第一行统一解构 `props`，例如 `const { a, b } = props`。这有助于保持函数签名简洁，并便于后续扩展和使用完整的 `props` 对象。
- **导出 Props 类型**：每个组件定义的 Props 类型或接口都必须通过 `export` 导出（例如 `export type ComponentNameProps = { ... }`），以便在外部需要时能够复用和扩展这些类型定义。

### Import 排序规范

- **顺序**：React -> 第三方包 -> 本地别名（如 `@/components`）-> 本地相对路径（如 `./utils`）。
- **空行**：每个模块组之间保持一行空行。
- **分隔**：确保 import 语句和业务代码之间有一行空行。
- **React 引入**：使用 `import * as React from 'react';` 并通过 `React.XXX` 访问 API（例如 `React.useState`、`React.useEffect`）。

### CSS 编写规范

样式优先级（从高到低）：

1. **Tailwind**：优先使用 Tailwind CSS 工具类完成样式。
2. **CSS Modules / LESS**：若 Tailwind 无法满足，使用 CSS Modules 或 LESS 文件管理样式（每个独立组件在同目录下维护 `style.module.less` 或 `style.less`）。
3. **Inline Styles**：仅在前两者都无法实现时（如动态计算属性、极微小的状态切换）使用 `style={{ ... }}` 内联样式。

- **坚决避免大量 Inline Styles**：不要在 JSX 中撰写长篇内联样式。

## 注意事项

- 部分 `@ts-expect-error` 注释是针对 `globalThis.__FORMILY_DEV_TOOLS_HOOK__` 等全局变量的，这些是预期行为，因为该全局变量在运行时注入。
- 扩展使用 `chrome.devtools.inspectedWindow.eval()` 来从开发者工具面板调用页面中的 Hook。
- 回填协议使用 `FillOperation[]`。Formily v2 通过 `form.setValuesIn(path, clonedValue)` 逐项执行，并兼容旧版 `setFieldValue`，等待 eval callback 返回真实结果。
- Hook 会序列化表单图，处理循环引用、React 节点（`$$typeof`）以及 Immer/Map 对象（`toJS`、`toJSON`）。
- `WXT_AI_*` 环境变量会被打包进扩展，只允许用于受控 PoC；正式内置服务必须通过服务端 Gateway 保存真正的模型密钥。

## 生产依赖

- `@arco-design/web-react` -- UI 组件（Tree、Tabs、Input、Button 等）
- `@formily/shared` -- FormPath 工具函数，用于树形构建
- `@microlink/react-json-view` -- JSON 查看器，用于树形信息展示
- `react` / `react-dom`（v19） -- UI 框架
- `clsx` -- 类名实用工具
- `@tailwindcss/vite` / `tailwindcss` -- CSS 框架
