import { OPENROUTER_FREE_BASE_URL } from './config'
import { resolveAIConfig } from './server-config'
import { AIConfig, FillOperation, FillResponse } from './types'

const FILL_RESPONSE_SCHEMA = {
  name: 'formily_fill_operations',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            value: {},
            reason: { type: 'string' },
          },
          required: ['path', 'value'],
          additionalProperties: false,
        },
      },
    },
    required: ['operations'],
    additionalProperties: false,
  },
}

const getJsonContent = (content: string) => {
  const trimmed = content.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)

  return match ? match[1].trim() : trimmed
}

type FormGraphNode = {
  component?: unknown
  displayName?: unknown
  display?: unknown
  hidden?: unknown
  visible?: unknown
  editable?: unknown
  disabled?: unknown
  readOnly?: unknown
  readPretty?: unknown
  unmounted?: unknown
}

const isWritableFormGraphNode = (path: string, node: unknown) => {
  if (!path || !node || typeof node !== 'object') return false

  const candidate = node as FormGraphNode
  if (candidate.displayName === 'Form' || candidate.displayName === 'VoidField') return false
  if (candidate.unmounted === true) return false
  if (candidate.display === 'none' || candidate.hidden === true || candidate.visible === false) return false
  if (
    candidate.editable === false ||
    candidate.disabled === true ||
    candidate.readOnly === true ||
    candidate.readPretty === true
  ) {
    return false
  }
  if (Array.isArray(candidate.component) && candidate.component[0] === 'ArrayTable.Index') return false

  return true
}

export const getWritableFormPaths = (formGraph: Record<string, unknown>) =>
  Object.entries(formGraph)
    .filter(([path, node]) => isWritableFormGraphNode(path, node))
    .map(([path]) => path)

const validateOperation = (
  operation: unknown,
  graphPaths: Set<string>,
  writablePaths: Set<string>,
  index: number
): FillOperation => {
  if (!operation || typeof operation !== 'object') {
    throw new Error(`第 ${index + 1} 条填充操作不是对象`)
  }

  const candidate = operation as Partial<FillOperation>
  if (!candidate.path || typeof candidate.path !== 'string') {
    throw new Error(`第 ${index + 1} 条填充操作缺少有效 path`)
  }
  if (!graphPaths.has(candidate.path)) {
    throw new Error(`AI 返回了 FormGraph 中不存在的路径: ${candidate.path}`)
  }
  if (!writablePaths.has(candidate.path)) {
    throw new Error(`AI 返回了不可写入的 FormGraph 路径: ${candidate.path}`)
  }
  if (!Object.prototype.hasOwnProperty.call(candidate, 'value')) {
    throw new Error(`路径 ${candidate.path} 缺少 value`)
  }

  return {
    path: candidate.path,
    value: candidate.value!,
    ...(typeof candidate.reason === 'string' ? { reason: candidate.reason } : {}),
  }
}

export const parseFillResponse = (content: string, formGraph: Record<string, unknown>): FillResponse => {
  const parsed: unknown = JSON.parse(getJsonContent(content))
  const graphPaths = new Set(Object.keys(formGraph).filter(Boolean))
  const writablePaths = new Set(getWritableFormPaths(formGraph))
  const rawOperations =
    parsed && typeof parsed === 'object' && Array.isArray((parsed as Partial<FillResponse>).operations)
      ? (parsed as FillResponse).operations
      : parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.entries(parsed).map(([path, value]) => ({ path, value }))
        : null

  if (!rawOperations) {
    throw new Error('AI 返回值必须是包含 operations 的 JSON 对象')
  }

  const seenPaths = new Set<string>()
  const operations = rawOperations.map((operation, index) => {
    const validated = validateOperation(operation, graphPaths, writablePaths, index)
    if (seenPaths.has(validated.path)) {
      throw new Error(`AI 返回了重复路径: ${validated.path}`)
    }
    seenPaths.add(validated.path)
    return validated
  })

  if (!operations.length) {
    throw new Error('AI 没有生成任何填充操作')
  }

  return { operations }
}

export const buildFillPrompt = (formGraph: Record<string, unknown>, instruction: string) => {
  const normalizedInstruction = instruction.trim() || '请为这个表单生成一组合理的测试数据'
  const writablePaths = getWritableFormPaths(formGraph)

  return [
    '你是 Formily 表单数据生成器。',
    `用户要求：${normalizedInstruction}`,
    '下面是当前表单完整的 FormGraph。对象 key 是可写入时应优先使用的真实字段路径。',
    JSON.stringify(formGraph, null, 2),
    `可写入字段路径：${JSON.stringify(writablePaths)}`,
    '请只返回 JSON，不要返回 Markdown 或解释。格式必须为：',
    '{"operations":[{"path":"字段路径","value":"任意 JSON 值","reason":"生成理由，可选"}]}',
    '要求：',
    '1. path 必须来自“可写入字段路径”，不得臆造路径，也不要选择布局节点。',
    '2. 数组、递归数组和复杂对象可以作为一个 value 写入其容器字段 path。',
    '3. 富文本可生成字段组件能够接受的 HTML、Markdown 或 JSON 值。',
    '4. 上传字段只生成组件 value 所需的文件元数据，不执行真实上传。',
    '5. 不要为 Form 根节点和纯布局节点生成操作。',
  ].join('\n\n')
}

export const requestFillOperations = async (
  config: AIConfig,
  formGraph: Record<string, unknown>,
  instruction: string
): Promise<FillResponse> => {
  const resolved = resolveAIConfig(config)
  const isOpenRouter = resolved.baseUrl.startsWith(OPENROUTER_FREE_BASE_URL)
  const requestBody = {
    model: resolved.model,
    messages: [
      {
        role: 'system',
        content: '你是一个只返回结构化 JSON 的 Formily 表单数据生成器。',
      },
      { role: 'user', content: buildFillPrompt(formGraph, instruction) },
    ],
    temperature: 0,
    ...(isOpenRouter
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: FILL_RESPONSE_SCHEMA,
          },
          provider: { require_parameters: true },
        }
      : {}),
  }
  const response = await fetch(`${resolved.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(resolved.apiKey ? { Authorization: `Bearer ${resolved.apiKey}` } : {}),
      ...(isOpenRouter ? { 'X-OpenRouter-Title': 'FormilyAutofill' } : {}),
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}${detail ? `\n${detail}` : ''}`)
  }

  const data: unknown = await response.json()
  const choice = (
    data as {
      choices?: Array<{
        message?: { content?: unknown }
        error?: { message?: unknown }
      }>
    }
  )?.choices?.[0]
  if (typeof choice?.error?.message === 'string') {
    throw new Error(`OpenRouter 模型执行失败: ${choice.error.message}`)
  }
  const content = choice?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 返回数据格式异常：缺少 message.content')
  }

  return parseFillResponse(content, formGraph)
}
