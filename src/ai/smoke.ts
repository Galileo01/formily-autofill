import { getWritableFormPaths } from './client'
import { FillOperation, JsonValue } from './types'

const getSmokeValue = (node: unknown): JsonValue => {
  if (!node || typeof node !== 'object') return 'FormilyAutofill smoke test'

  const record = node as Record<string, unknown>
  const type = String(record.dataType || record.type || '').toLowerCase()

  if (type.includes('number')) return 1
  if (type.includes('boolean')) return true
  if (type.includes('array')) return []
  if (type.includes('object')) return {}

  return 'FormilyAutofill smoke test'
}

export const createSmokeOperation = (formGraph: Record<string, unknown>, selectedPath?: string): FillOperation => {
  const writablePaths = getWritableFormPaths(formGraph)
  const path = selectedPath && writablePaths.includes(selectedPath) ? selectedPath : writablePaths[0]

  if (!path) {
    throw new Error('当前 FormGraph 中没有可用于 Smoke 测试的可写字段路径')
  }

  return {
    path,
    value: getSmokeValue(formGraph[path]),
    reason: '本地固定值，用于验证 FormGraph → 回填链路',
  }
}
