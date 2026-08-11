interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY?: string
  readonly WXT_AI_BASE_URL?: string
  readonly WXT_AI_MODEL?: string
  readonly WXT_AI_GATEWAY_BASE_URL?: string
  readonly WXT_AI_GATEWAY_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
