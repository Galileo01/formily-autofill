import { AIConfig } from './types'

export const OPENROUTER_FREE_BASE_URL = 'https://openrouter.ai/api/v1'
export const OPENROUTER_FREE_MODEL = 'openrouter/free'

const DEVELOPMENT_AI_TARGET = {
  baseUrl: import.meta.env.WXT_AI_BASE_URL || OPENROUTER_FREE_BASE_URL,
  model: import.meta.env.WXT_AI_MODEL || OPENROUTER_FREE_MODEL,
}

const GATEWAY_AI_TARGET = {
  baseUrl: import.meta.env.WXT_AI_GATEWAY_BASE_URL || '',
  model: import.meta.env.WXT_AI_GATEWAY_MODEL || OPENROUTER_FREE_MODEL,
}

export const builtinAIKind = import.meta.env.DEV ? 'development' : GATEWAY_AI_TARGET.baseUrl ? 'gateway' : undefined

export const hasBuiltinAIConfig = Boolean(builtinAIKind)

export const getAIRequestTarget = (config: AIConfig) => {
  const target =
    config.mode === 'builtin'
      ? builtinAIKind === 'development'
        ? DEVELOPMENT_AI_TARGET
        : GATEWAY_AI_TARGET
      : {
          baseUrl: config.baseUrl.trim(),
          model: config.model.trim(),
        }

  if (!target.baseUrl || !target.model || (config.mode === 'custom' && !config.apiKey.trim())) {
    const source = config.mode === 'builtin' ? '内置 AI' : '自定义 AI'
    throw new Error(`${source} 配置不完整，请检查 Base URL、API Key 和模型`)
  }

  return target
}
