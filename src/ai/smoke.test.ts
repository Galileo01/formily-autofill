import { describe, expect, it } from 'vitest'

import { createSmokeOperation } from './smoke'

describe('createSmokeOperation', () => {
  const formGraph = {
    '': { type: 'Form', displayName: 'Form' },
    layout: { displayName: 'VoidField' },
    index: { component: ['ArrayTable.Index', {}] },
    disabledField: { dataType: 'string', disabled: true },
    readOnlyField: { dataType: 'string', readOnly: true },
    readPrettyField: { dataType: 'string', readPretty: true },
    hiddenField: { dataType: 'string', hidden: true },
    username: { dataType: 'string' },
    age: { dataType: 'number' },
    employees: { dataType: 'array' },
  }

  it('uses the selected path when it is writable', () => {
    expect(createSmokeOperation(formGraph, 'age')).toMatchObject({
      path: 'age',
      value: 1,
    })
  })

  it('falls back to the first writable path when selected path is not writable', () => {
    expect(createSmokeOperation(formGraph, 'layout')).toMatchObject({
      path: 'username',
      value: 'FormilyAutofill smoke test',
    })
  })

  it('ignores the root form key and falls back to the first writable path', () => {
    expect(createSmokeOperation(formGraph, '')).toMatchObject({
      path: 'username',
      value: 'FormilyAutofill smoke test',
    })
  })

  it('skips disabled, read-only, read-pretty, hidden and index nodes', () => {
    expect(createSmokeOperation(formGraph, 'disabledField').path).toBe('username')
    expect(createSmokeOperation(formGraph, 'readOnlyField').path).toBe('username')
    expect(createSmokeOperation(formGraph, 'readPrettyField').path).toBe('username')
    expect(createSmokeOperation(formGraph, 'hiddenField').path).toBe('username')
    expect(createSmokeOperation(formGraph, 'index').path).toBe('username')
  })

  it('supports container values for arrays', () => {
    expect(createSmokeOperation(formGraph, 'employees')).toMatchObject({
      path: 'employees',
      value: [],
    })
  })

  it('throws when there is no writable path', () => {
    expect(() =>
      createSmokeOperation({
        '': { type: 'Form', displayName: 'Form' },
        layout: { displayName: 'VoidField' },
        disabledField: { dataType: 'string', disabled: true },
      })
    ).toThrow('没有可用于 Smoke 测试的可写字段路径')
  })
})
