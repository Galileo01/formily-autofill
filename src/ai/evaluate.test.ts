import { describe, expect, it } from 'vitest'

import { createApplyFillExpression } from './evaluate'

describe('createApplyFillExpression', () => {
  it('preserves non-numeric Formily instance ids', () => {
    const expression = createApplyFillExpression('form-instance-a8f2', [{ path: 'username', value: 'test-user' }])

    expect(expression).toContain('applyFillOperations("form-instance-a8f2"')
    expect(expression).not.toContain('applyFillOperations(null')
  })
})
