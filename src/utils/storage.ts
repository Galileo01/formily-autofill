import { hasBuiltinAIConfig, OPENROUTER_FREE_BASE_URL, OPENROUTER_FREE_MODEL } from '../ai/config'
import { AIConfig } from '../ai/types'

export type { AIConfig } from '../ai/types'

type StoredAIConfig = Omit<AIConfig, 'apiKey'>

export const DEFAULT_AI_CONFIG: AIConfig = {
  mode: hasBuiltinAIConfig ? 'builtin' : 'custom',
  baseUrl: OPENROUTER_FREE_BASE_URL,
  apiKey: '',
  model: OPENROUTER_FREE_MODEL,
  rememberApiKey: false,
}

const CONFIG_STORAGE_KEY = 'formily-autofill-ai-config'
const SESSION_API_KEY = 'formily-autofill-ai-api-key-session'
const PERSISTENT_API_KEY = 'formily-autofill-ai-api-key-persistent'

export const restrictAIStorageAccess = async () => {
  await Promise.all([
    chrome.storage.local.setAccessLevel?.({
      accessLevel: 'TRUSTED_CONTEXTS',
    }),
    chrome.storage.session.setAccessLevel?.({
      accessLevel: 'TRUSTED_CONTEXTS',
    }),
  ])
}

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const [localResult, sessionResult] = await Promise.all([
      chrome.storage.local.get([CONFIG_STORAGE_KEY, PERSISTENT_API_KEY]),
      chrome.storage.session.get(SESSION_API_KEY),
    ])
    const storedConfig = localResult[CONFIG_STORAGE_KEY] as Partial<StoredAIConfig> | undefined
    const config = { ...DEFAULT_AI_CONFIG, ...storedConfig }
    const sessionApiKey = sessionResult[SESSION_API_KEY]
    const persistentApiKey = localResult[PERSISTENT_API_KEY]

    return {
      ...config,
      apiKey:
        typeof sessionApiKey === 'string'
          ? sessionApiKey
          : config.rememberApiKey && typeof persistentApiKey === 'string'
            ? persistentApiKey
            : '',
    }
  } catch (error) {
    console.warn('[FormilyAutofill] getAIConfig failed:', error)
    return { ...DEFAULT_AI_CONFIG }
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const { apiKey, ...storedConfig } = config

  await chrome.storage.local.set({
    [CONFIG_STORAGE_KEY]: storedConfig,
  })

  if (config.mode !== 'custom' || !apiKey) {
    await Promise.all([chrome.storage.session.remove(SESSION_API_KEY), chrome.storage.local.remove(PERSISTENT_API_KEY)])
    return
  }

  if (config.rememberApiKey) {
    await Promise.all([
      chrome.storage.local.set({ [PERSISTENT_API_KEY]: apiKey }),
      chrome.storage.session.remove(SESSION_API_KEY),
    ])
    return
  }

  await Promise.all([
    chrome.storage.session.set({ [SESSION_API_KEY]: apiKey }),
    chrome.storage.local.remove(PERSISTENT_API_KEY),
  ])
}
