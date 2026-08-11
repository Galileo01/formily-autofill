import { ApplyFillResult, FillOperation, FillOperationResult, FormInstanceId } from './types'

export type FillableForm = {
  setValuesIn?: (path: string, value: unknown) => void
  setFieldValue?: (path: string, value: unknown) => void
  getValuesIn?: (path: string) => unknown
  getFieldValue?: (path: string) => unknown
  getFieldState?: (path: string) => { value?: unknown } | undefined
}

export const getRetryFillOperations = (operations: FillOperation[], result: ApplyFillResult) => {
  const failedPaths = new Set(result.results.filter((item) => item.status === 'failed').map((item) => item.path))

  return operations.filter((operation) => failedPaths.has(operation.path))
}

export const applyFillOperations = (
  form: FillableForm | undefined,
  formId: FormInstanceId,
  operations: FillOperation[],
  serialize: (value: unknown) => unknown = (value) => value
): ApplyFillResult => {
  if (!form) {
    return {
      success: false,
      results: operations.map((operation) => ({
        path: operation.path,
        requestedValue: operation.value,
        status: 'failed' as const,
        error: `Form ${formId} 不存在或已经卸载`,
      })),
    }
  }

  const results: FillOperationResult[] = operations.map((operation) => {
    try {
      const setValue = form.setValuesIn || form.setFieldValue
      if (!setValue) {
        throw new Error('当前 Form 实例不支持按路径写入值')
      }

      const value = globalThis.structuredClone
        ? globalThis.structuredClone(operation.value)
        : JSON.parse(JSON.stringify(operation.value))

      setValue.call(form, operation.path, value)
      const actualValue = form.getValuesIn
        ? form.getValuesIn(operation.path)
        : form.getFieldValue
          ? form.getFieldValue(operation.path)
          : form.getFieldState?.(operation.path)?.value

      return {
        path: operation.path,
        requestedValue: operation.value,
        actualValue: serialize(actualValue),
        status: 'success' as const,
      }
    } catch (error) {
      return {
        path: operation.path,
        requestedValue: operation.value,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  return {
    success: results.every((result) => result.status === 'success'),
    results,
  }
}
