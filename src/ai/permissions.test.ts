import { describe, expect, it } from 'vitest'

import { getAIHostPermissionPattern } from './permissions'

describe('getAIHostPermissionPattern', () => {
  it('reduces an HTTPS Base URL to its origin permission', () => {
    expect(getAIHostPermissionPattern('https://example.com/openai/v1')).toBe('https://example.com/*')
  })

  it('rejects remote plain HTTP services', () => {
    expect(() => getAIHostPermissionPattern('http://example.com/v1')).toThrow('必须使用 HTTPS')
  })

  it('rejects invalid URLs', () => {
    expect(() => getAIHostPermissionPattern('not-a-url')).toThrow('不是有效的 URL')
  })
})
