import { afterEach, describe, expect, it, vi } from 'vitest'

import { OPENROUTER_FREE_BASE_URL, OPENROUTER_FREE_MODEL } from './config'
import { buildFillPrompt, getWritableFormPaths, parseFillResponse, requestFillOperations } from './client'
import { resolveAIConfig } from './server-config'
import { arrayTableProjectsFixture } from '../../tests/fixtures/form-graphs/array-table-projects'
import { registrationComplexFieldsFixture } from '../../tests/fixtures/form-graphs/registration-complex-fields'
import { simpleLoginFixture } from '../../tests/fixtures/form-graphs/simple-login'

const formGraph = {
  '': { type: 'Form' },
  username: { dataType: 'string', title: '用户名' },
  employees: { dataType: 'array', title: '员工' },
}

const createMockValue = (...parts: string[]) => parts.join('-')
const mockApiCredential = createMockValue('mock', 'credential')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildFillPrompt', () => {
  it('includes the full form graph and natural-language instruction', () => {
    const prompt = buildFillPrompt(formGraph, '生成三条员工数据')

    expect(prompt).toContain('生成三条员工数据')
    expect(prompt).toContain('"username"')
    expect(prompt).toContain('"employees"')
  })
})

describe('parseFillResponse', () => {
  it('parses operation arrays with complex JSON values', () => {
    const result = parseFillResponse(
      JSON.stringify({
        operations: [
          {
            path: 'employees',
            value: [{ name: '管理员', children: [{ name: '成员' }] }],
          },
        ],
      }),
      formGraph
    )

    expect(result.operations).toEqual([
      {
        path: 'employees',
        value: [{ name: '管理员', children: [{ name: '成员' }] }],
      },
    ])
  })

  it('accepts fenced JSON and legacy path-value objects', () => {
    const result = parseFillResponse('```json\n{"username":"测试用户"}\n```', formGraph)

    expect(result.operations).toEqual([{ path: 'username', value: '测试用户' }])
  })

  it('rejects paths that do not exist in the graph', () => {
    expect(() => parseFillResponse('{"operations":[{"path":"missing","value":1}]}', formGraph)).toThrow(
      'FormGraph 中不存在的路径'
    )
  })

  it('rejects duplicate paths', () => {
    expect(() =>
      parseFillResponse('{"operations":[{"path":"username","value":"A"},{"path":"username","value":"B"}]}', formGraph)
    ).toThrow('重复路径')
  })
})

describe('FormGraph fixtures', () => {
  it('accepts only the writable paths in the simple login fixture', () => {
    const result = parseFillResponse(
      JSON.stringify({
        operations: [
          { path: 'username', value: 'test_user_001' },
          { path: 'password', value: 'Test!234567' },
        ],
      }),
      simpleLoginFixture.graph
    )

    expect(result.operations.map((operation) => operation.path)).toEqual(
      simpleLoginFixture.assertions.expectedWritablePaths
    )
    expect(() => parseFillResponse('{"operations":[{"path":"","value":{}}]}', simpleLoginFixture.graph)).toThrow(
      '缺少有效 path'
    )
  })

  it('excludes layout paths and retains complex writable paths in the registration fixture', () => {
    expect(getWritableFormPaths(registrationComplexFieldsFixture.graph)).toEqual(
      registrationComplexFieldsFixture.assertions.expectedWritablePaths
    )

    const result = parseFillResponse(
      JSON.stringify({
        operations: [
          { path: 'gender', value: 2 },
          { path: 'address', value: ['110000', '110000', '110101'] },
          { path: 'contacts', value: [{ name: '测试联系人', phone: '13800000000' }] },
        ],
      }),
      registrationComplexFieldsFixture.graph
    )

    expect(result.operations).toHaveLength(3)
    expect(() =>
      parseFillResponse(
        '{"operations":[{"path":"NO_NAME_FIELD_$0","value":{}}]}',
        registrationComplexFieldsFixture.graph
      )
    ).toThrow('不可写入')
  })

  it('uses the ArrayTable container instead of read-only rows and layout fields', () => {
    expect(getWritableFormPaths(arrayTableProjectsFixture.graph)).toEqual(
      arrayTableProjectsFixture.assertions.expectedWritablePaths
    )

    const result = parseFillResponse(
      JSON.stringify({
        operations: [
          {
            path: 'projects',
            value: [
              { price: 100, count: 2 },
              { price: 200, count: 3 },
            ],
          },
        ],
      }),
      arrayTableProjectsFixture.graph
    )

    expect(result.operations).toHaveLength(1)
    expect(() =>
      parseFillResponse(
        '{"operations":[{"path":"projects.0.NO_NAME_FIELD_$4","value":1}]}',
        arrayTableProjectsFixture.graph
      )
    ).toThrow('不可写入')
  })
})

describe('resolveAIConfig', () => {
  it('resolves a complete custom OpenAI-compatible service', () => {
    expect(
      resolveAIConfig({
        mode: 'custom',
        baseUrl: ' https://example.com/v1/ ',
        apiKey: ` ${mockApiCredential} `,
        model: ' test-model ',
        rememberApiKey: false,
      })
    ).toEqual({
      baseUrl: 'https://example.com/v1/',
      apiKey: mockApiCredential,
      model: 'test-model',
      source: 'custom',
    })
  })
})

describe('requestFillOperations', () => {
  it('uses the OpenRouter free router with structured output constraints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"operations":[{"path":"username","value":"测试用户"}]}',
              },
            },
          ],
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestFillOperations(
      {
        mode: 'custom',
        baseUrl: OPENROUTER_FREE_BASE_URL,
        apiKey: mockApiCredential,
        model: OPENROUTER_FREE_MODEL,
        rememberApiKey: false,
      },
      formGraph,
      '生成测试用户'
    )

    expect(result.operations).toEqual([{ path: 'username', value: '测试用户' }])
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${mockApiCredential}`,
      'X-OpenRouter-Title': 'FormilyAutofill',
    })
    expect(body).toMatchObject({
      model: 'openrouter/free',
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'formily_fill_operations', strict: true },
      },
      provider: { require_parameters: true },
    })
  })
})
