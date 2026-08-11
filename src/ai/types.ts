export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export type FormInstanceId = string | number

export type FillOperation = {
  path: string
  value: JsonValue
  reason?: string
}

export type FillResponse = {
  operations: FillOperation[]
}

export type FillOperationResult = {
  path: string
  requestedValue: JsonValue
  actualValue?: unknown
  status: 'success' | 'failed'
  error?: string
}

export type ApplyFillResult = {
  success: boolean
  results: FillOperationResult[]
}

export type AIServiceMode = 'builtin' | 'custom'

export type AIConfig = {
  mode: AIServiceMode
  baseUrl: string
  apiKey: string
  model: string
  rememberApiKey: boolean
}

export type ResolvedAIConfig = Pick<AIConfig, 'baseUrl' | 'model'> & {
  apiKey?: string
  source: 'development' | 'gateway' | 'custom'
}
