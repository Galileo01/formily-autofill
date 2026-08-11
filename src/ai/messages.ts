import { FillResponse } from './types'

export const AI_FILL_REQUEST = '@formily-autofill/ai-fill-request'

export type AIFillRequest = {
  type: typeof AI_FILL_REQUEST
  formGraph: Record<string, unknown>
  instruction: string
}

export type AIFillMessageResponse = { ok: true; data: FillResponse } | { ok: false; error: string }

export const requestAIFill = async (formGraph: Record<string, unknown>, instruction: string) => {
  const response = (await chrome.runtime.sendMessage({
    type: AI_FILL_REQUEST,
    formGraph,
    instruction,
  } satisfies AIFillRequest)) as AIFillMessageResponse | undefined

  if (!response) throw new Error('Background 没有返回 AI 请求结果')
  if (!response.ok) throw new Error(response.error)

  return response.data
}
