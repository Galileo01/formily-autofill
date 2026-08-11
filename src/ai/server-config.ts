import { getAIRequestTarget } from './config'
import { AIConfig, ResolvedAIConfig } from './types'

const getDevelopmentApiKey = () => (import.meta.env.DEV ? import.meta.env.OPENROUTER_API_KEY || '' : '')

export const resolveAIConfig = (config: AIConfig): ResolvedAIConfig => {
  const target = getAIRequestTarget(config)
  const resolved: ResolvedAIConfig =
    config.mode === 'custom'
      ? {
          ...target,
          apiKey: config.apiKey.trim(),
          source: 'custom',
        }
      : import.meta.env.DEV
        ? {
            ...target,
            apiKey: getDevelopmentApiKey(),
            source: 'development',
          }
        : { ...target, source: 'gateway' }

  if (resolved.source !== 'gateway' && !resolved.apiKey) {
    throw new Error(
      resolved.source === 'development'
        ? '内置 AI 配置不完整，请在 .env.local 或 .env 中提供 OPENROUTER_API_KEY'
        : '自定义 AI 配置不完整，请检查 API Key'
    )
  }

  return resolved
}
