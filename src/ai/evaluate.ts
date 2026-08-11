import { FillOperation } from './types'

export const createApplyFillExpression = (formId: string, operations: FillOperation[]) => {
  const serializedOperations = JSON.stringify(operations)

  return (
    `window.__FORMILY_DEV_TOOLS_HOOK__?.applyFillOperations(` +
    `${JSON.stringify(formId)}, JSON.parse(${JSON.stringify(serializedOperations)}))`
  )
}
