import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyFillOperations, getRetryFillOperations } from '../../src/ai/apply'
import type { FillableForm } from '../../src/ai/apply'
import { requestFillOperations } from '../../src/ai/client'
import { OPENROUTER_FREE_BASE_URL, OPENROUTER_FREE_MODEL } from '../../src/ai/config'
import type { AIConfig, FillOperation } from '../../src/ai/types'
import { arrayTableProjectsFixture } from '../fixtures/form-graphs/array-table-projects'
import { registrationComplexFieldsFixture } from '../fixtures/form-graphs/registration-complex-fields'
import { simpleLoginFixture } from '../fixtures/form-graphs/simple-login'

const createMockValue = (...parts: string[]) => parts.join('-')
const mockApiCredential = createMockValue('mock', 'credential')
const mockUsername = createMockValue('fixture', 'user', '001')
const mockPassword = createMockValue('fixture', 'password', 'value')

const testAIConfig: AIConfig = {
  mode: 'custom',
  baseUrl: OPENROUTER_FREE_BASE_URL,
  apiKey: mockApiCredential,
  model: OPENROUTER_FREE_MODEL,
  rememberApiKey: false,
}

const stubAIResponse = (operations: FillOperation[]) => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({ operations }),
            },
          },
        ],
      }),
      { status: 200 }
    )
  )

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const createMockForm = (failOncePaths: string[] = []) => {
  const values: Record<string, unknown> = {}
  const pendingFailures = new Set(failOncePaths)
  const form: FillableForm = {
    setValuesIn: (path, value) => {
      if (pendingFailures.delete(path)) {
        throw new Error(`模拟写入失败: ${path}`)
      }
      values[path] = value
    },
    getValuesIn: (path) => values[path],
  }

  return { form, values }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI fill integration flow', () => {
  it('runs login fixture through mocked HTTP, production parsing, apply, readback, and retry', async () => {
    const modelOperations: FillOperation[] = [
      { path: 'username', value: mockUsername, reason: '生成测试用户名' },
      { path: 'password', value: mockPassword, reason: '生成强密码' },
    ]
    const fetchMock = stubAIResponse(modelOperations)
    const response = await requestFillOperations(testAIConfig, simpleLoginFixture.graph, simpleLoginFixture.instruction)
    const { form, values } = createMockForm(['password'])

    const firstResult = applyFillOperations(form, 'fixture-simple-login', response.operations)
    const retryOperations = getRetryFillOperations(response.operations, firstResult)
    const retryResult = applyFillOperations(form, 'fixture-simple-login', retryOperations)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const requestBody = JSON.parse(String(requestInit.body)) as {
      messages: Array<{ role: string; content: string }>
    }
    const userPrompt = requestBody.messages.find((message) => message.role === 'user')?.content
    expect(userPrompt).toContain(simpleLoginFixture.instruction)
    expect(userPrompt).toContain('"username"')
    expect(userPrompt).toContain('"password"')
    expect(response.operations).toEqual(modelOperations)
    expect(firstResult).toMatchObject({
      success: false,
      results: [
        { path: 'username', status: 'success', actualValue: mockUsername },
        { path: 'password', status: 'failed', error: '模拟写入失败: password' },
      ],
    })
    expect(retryOperations).toEqual([modelOperations[1]])
    expect(retryResult).toMatchObject({
      success: true,
      results: [{ path: 'password', status: 'success', actualValue: mockPassword }],
    })
    expect(values).toEqual({
      username: mockUsername,
      password: mockPassword,
    })
  })

  it('preserves registration enum, date, cascader, upload metadata, and array values', async () => {
    const modelOperations: FillOperation[] = [
      { path: 'gender', value: 2 },
      { path: 'birthday', value: '1995-06-18' },
      { path: 'address', value: ['110000', '110000', '110101'] },
      {
        path: 'idCard',
        value: [{ uid: 'fixture-id-card', name: 'id-card.png', status: 'done' }],
      },
      {
        path: 'contacts',
        value: [{ name: '测试联系人', phone: '13800000000' }],
      },
    ]
    stubAIResponse(modelOperations)
    const response = await requestFillOperations(
      testAIConfig,
      registrationComplexFieldsFixture.graph,
      registrationComplexFieldsFixture.instruction
    )
    const { form, values } = createMockForm()

    const result = applyFillOperations(form, 'fixture-registration', response.operations)

    expect(result.success).toBe(true)
    expect(result.results.map((item) => item.actualValue)).toEqual(modelOperations.map((item) => item.value))
    expect(values).toEqual({
      gender: 2,
      birthday: '1995-06-18',
      address: ['110000', '110000', '110101'],
      idCard: [{ uid: 'fixture-id-card', name: 'id-card.png', status: 'done' }],
      contacts: [{ name: '测试联系人', phone: '13800000000' }],
    })
  })

  it('writes ArrayTable rows through the projects container and clones the model value', async () => {
    const projects = [
      { price: 100, count: 2 },
      { price: 200, count: 3 },
    ]
    stubAIResponse([{ path: 'projects', value: projects }])
    const response = await requestFillOperations(
      testAIConfig,
      arrayTableProjectsFixture.graph,
      arrayTableProjectsFixture.instruction
    )
    const { form, values } = createMockForm()

    const result = applyFillOperations(form, 'fixture-array-table', response.operations)

    expect(result).toMatchObject({
      success: true,
      results: [{ path: 'projects', status: 'success', actualValue: projects }],
    })
    expect(values.projects).toEqual(projects)
    expect(values.projects).not.toBe(response.operations[0].value)
    expect(response.operations.map((operation) => operation.path)).toEqual(['projects'])
  })
})
