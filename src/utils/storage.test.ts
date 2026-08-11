import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAIConfig, saveAIConfig } from './storage'
import { AIConfig } from '../ai/types'

const createStorageArea = () => {
  const values: Record<string, unknown> = {}

  return {
    values,
    area: {
      get: vi.fn(async (keys: string | string[]) => {
        const names = Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(
          names.filter((name) => Object.hasOwn(values, name)).map((name) => [name, values[name]])
        )
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(values, items)
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const names = Array.isArray(keys) ? keys : [keys]
        names.forEach((name) => delete values[name])
      }),
    },
  }
}

const customConfig: AIConfig = {
  mode: 'custom',
  baseUrl: 'https://example.com/v1',
  apiKey: 'session-secret',
  model: 'test-model',
  rememberApiKey: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI config storage', () => {
  it('keeps the API key in session storage by default', async () => {
    const local = createStorageArea()
    const session = createStorageArea()
    vi.stubGlobal('chrome', {
      storage: { local: local.area, session: session.area },
    })

    await saveAIConfig(customConfig)

    expect(JSON.stringify(local.values)).not.toContain('session-secret')
    expect(JSON.stringify(session.values)).toContain('session-secret')
    await expect(getAIConfig()).resolves.toEqual(customConfig)
  })

  it('persists the API key only after explicit opt-in', async () => {
    const local = createStorageArea()
    const session = createStorageArea()
    vi.stubGlobal('chrome', {
      storage: { local: local.area, session: session.area },
    })
    const rememberedConfig = {
      ...customConfig,
      apiKey: 'persistent-secret',
      rememberApiKey: true,
    }

    await saveAIConfig(rememberedConfig)

    expect(JSON.stringify(local.values)).toContain('persistent-secret')
    expect(JSON.stringify(session.values)).not.toContain('persistent-secret')
    await expect(getAIConfig()).resolves.toEqual(rememberedConfig)
  })
})
