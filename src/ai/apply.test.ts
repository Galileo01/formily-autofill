import { describe, expect, it } from 'vitest'

import { applyFillOperations, FillableForm, getRetryFillOperations } from './apply'

describe('getRetryFillOperations', () => {
  it('keeps only failed operations for retry', () => {
    const operations = [
      { path: 'username', value: 'test-user' },
      { path: 'password', value: 'test-password' },
    ]

    expect(
      getRetryFillOperations(operations, {
        success: false,
        results: [
          {
            path: 'username',
            requestedValue: 'test-user',
            status: 'success',
          },
          {
            path: 'password',
            requestedValue: 'test-password',
            status: 'failed',
            error: 'write failed',
          },
        ],
      })
    ).toEqual([{ path: 'password', value: 'test-password' }])
  })

  it('returns an empty list after all operations succeed', () => {
    const operations = [{ path: 'username', value: 'test-user' }]

    expect(
      getRetryFillOperations(operations, {
        success: true,
        results: [
          {
            path: 'username',
            requestedValue: 'test-user',
            status: 'success',
          },
        ],
      })
    ).toEqual([])
  })
})

describe('applyFillOperations', () => {
  it('uses the Formily v2 setValuesIn API', () => {
    const values: Record<string, unknown> = {}
    const form: FillableForm = {
      setValuesIn: (path, value) => {
        values[path] = value
      },
      getValuesIn: (path) => values[path],
    }
    const sourceValue = [{ name: '管理员' }]

    const result = applyFillOperations(form, 1, [{ path: 'employees', value: sourceValue }])

    expect(result.success).toBe(true)
    expect(result.results[0]).toMatchObject({
      path: 'employees',
      status: 'success',
      actualValue: sourceValue,
    })
    expect(values.employees).not.toBe(sourceValue)
  })

  it('supports the legacy setFieldValue API', () => {
    const values: Record<string, unknown> = {}
    const form: FillableForm = {
      setFieldValue: (path, value) => {
        values[path] = value
      },
      getFieldValue: (path) => values[path],
    }

    const result = applyFillOperations(form, 'legacy-form', [{ path: 'username', value: 'test-user' }])

    expect(result).toMatchObject({
      success: true,
      results: [{ path: 'username', actualValue: 'test-user' }],
    })
  })

  it('keeps applying after one field fails', () => {
    const appliedPaths: string[] = []
    const form: FillableForm = {
      setValuesIn: (path) => {
        if (path === 'broken') throw new Error('write failed')
        appliedPaths.push(path)
      },
    }

    const result = applyFillOperations(form, 1, [
      { path: 'broken', value: 1 },
      { path: 'working', value: 2 },
    ])

    expect(result.success).toBe(false)
    expect(result.results.map((item) => item.status)).toEqual(['failed', 'success'])
    expect(appliedPaths).toEqual(['working'])
  })

  it('returns a clear error when no path writer is available', () => {
    const result = applyFillOperations({}, 'unsupported-form', [{ path: 'username', value: 'test-user' }])

    expect(result).toMatchObject({
      success: false,
      results: [
        {
          path: 'username',
          status: 'failed',
          error: '当前 Form 实例不支持按路径写入值',
        },
      ],
    })
  })

  it('returns a failed result when the form is unavailable', () => {
    const result = applyFillOperations(undefined, 'form-instance-a8f2', [{ path: 'username', value: 'test' }])

    expect(result).toMatchObject({
      success: false,
      results: [
        {
          path: 'username',
          status: 'failed',
          error: 'Form form-instance-a8f2 不存在或已经卸载',
        },
      ],
    })
  })
})
