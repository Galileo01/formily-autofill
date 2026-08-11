import * as React from 'react'

import { Alert, Button, Checkbox, Input, Spin, Tooltip } from '@arco-design/web-react'
import { IconCopy, IconSettings } from '@arco-design/web-react/icon'

import { getRetryFillOperations } from '@/ai/apply'
import { builtinAIKind, getAIRequestTarget, hasBuiltinAIConfig } from '@/ai/config'
import { createApplyFillExpression } from '@/ai/evaluate'
import { requestAIFill } from '@/ai/messages'
import { ensureAIHostPermission } from '@/ai/permissions'
import { createSmokeOperation } from '@/ai/smoke'
import { AIConfig, ApplyFillResult, FillOperation } from '@/ai/types'
import { DEFAULT_AI_CONFIG, getAIConfig, saveAIConfig } from '@/utils/storage'

import styles from './index.module.less'

export type AIFillProps = {
  formGraph?: Record<string, unknown>
  formId?: string
  selectedPath?: string
}

type AIFillNotice = {
  type: 'success' | 'warning'
  content: string
}

const evaluateFillOperations = (formId: string, operations: FillOperation[]) =>
  new Promise<ApplyFillResult>((resolve, reject) => {
    const expression = createApplyFillExpression(formId, operations)

    chrome.devtools.inspectedWindow.eval(expression, (result: unknown, exceptionInfo) => {
      if (exceptionInfo?.isException) {
        reject(new Error(exceptionInfo.description || exceptionInfo.value || '页面执行失败'))
        return
      }

      if (!result || typeof result !== 'object') {
        reject(new Error('页面 Hook 没有返回有效的填充结果'))
        return
      }

      resolve(result as ApplyFillResult)
    })
  })

const AIFill = (props: AIFillProps) => {
  const { formGraph, formId, selectedPath } = props

  const [config, setConfig] = React.useState<AIConfig>({ ...DEFAULT_AI_CONFIG })
  const [instruction, setInstruction] = React.useState('请根据字段名称和组件类型生成一组合理的测试数据')
  const [loading, setLoading] = React.useState(false)
  const [hasAIGenerated, setHasAIGenerated] = React.useState(false)
  const [applying, setApplying] = React.useState(false)
  const [operations, setOperations] = React.useState<FillOperation[]>([])
  const [applyResult, setApplyResult] = React.useState<ApplyFillResult>()
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState<AIFillNotice>()
  const [configVisible, setConfigVisible] = React.useState(false)
  const [dataSharingAcknowledged, setDataSharingAcknowledged] = React.useState(false)
  const aiRequestIdRef = React.useRef(0)

  React.useEffect(() => {
    getAIConfig().then(setConfig)
  }, [])

  React.useEffect(() => {
    aiRequestIdRef.current += 1
    setLoading(false)
    setOperations([])
    setHasAIGenerated(false)
    setApplyResult(undefined)
    setError('')
    setNotice(undefined)
    setDataSharingAcknowledged(false)
  }, [formId])

  const handleGenerate = async () => {
    if (!formGraph) {
      setError('请先在左侧面板选择一个表单')
      return
    }
    if (!dataSharingAcknowledged) {
      setError('请先确认完整 FormGraph（可能包含当前表单值）会发送给所选 AI 服务')
      return
    }

    const requestId = aiRequestIdRef.current + 1
    aiRequestIdRef.current = requestId
    const isCurrentAIRequest = () => aiRequestIdRef.current === requestId

    setLoading(true)
    setError('')
    setNotice(undefined)

    try {
      const target = getAIRequestTarget(config)
      const permissionGranted = await ensureAIHostPermission(target.baseUrl)
      if (!isCurrentAIRequest()) return
      if (!permissionGranted) throw new Error('未获得 AI 服务域名访问权限')

      await saveAIConfig(config)
      if (!isCurrentAIRequest()) return

      const response = await requestAIFill(formGraph, instruction)
      if (!isCurrentAIRequest()) return

      setOperations(response.operations)
      setHasAIGenerated(true)
      setApplyResult(undefined)
    } catch (requestError) {
      if (!isCurrentAIRequest()) return

      setError(requestError instanceof Error ? requestError.message : 'AI 请求失败')
      if (config.mode === 'builtin' && !hasBuiltinAIConfig) {
        setConfigVisible(true)
      }
    } finally {
      if (isCurrentAIRequest()) {
        setLoading(false)
      }
    }
  }

  const handleSmoke = () => {
    if (!formGraph) {
      setError('请先在左侧面板选择一个表单')
      return
    }

    try {
      setOperations([createSmokeOperation(formGraph, selectedPath)])
      setHasAIGenerated(false)
      setApplyResult(undefined)
      setError('')
      setNotice(undefined)
    } catch (smokeError) {
      setError(smokeError instanceof Error ? smokeError.message : 'Smoke 生成失败')
    }
  }

  const handleFill = async () => {
    if (!operations.length || formId === undefined) return

    setApplying(true)
    setApplyResult(undefined)
    setError('')
    setNotice(undefined)

    try {
      const result = await evaluateFillOperations(formId, operations)
      setApplyResult(result)
      setOperations(getRetryFillOperations(operations, result))
      const successCount = result.results.filter((item) => item.status === 'success').length
      const failedCount = result.results.length - successCount

      if (failedCount) {
        setNotice({
          type: 'warning',
          content: `填充完成：成功 ${successCount}，失败 ${failedCount}`,
        })
      } else {
        setNotice({
          type: 'success',
          content: `表单填充成功，共 ${successCount} 个字段`,
        })
      }
    } catch (fillError) {
      setNotice(undefined)
      setError(fillError instanceof Error ? fillError.message : '表单填充失败')
    } finally {
      setApplying(false)
    }
  }

  const handleCopyFormGraph = async () => {
    if (!formGraph) return

    try {
      await navigator.clipboard.writeText(JSON.stringify(formGraph, null, 2))
      setError('')
      setNotice({
        type: 'success',
        content: '完整 FormGraph 已复制',
      })
    } catch (copyError) {
      setNotice(undefined)
      setError(copyError instanceof Error ? copyError.message : '复制完整 FormGraph 失败')
    }
  }

  const handleSaveConfig = async () => {
    try {
      const target = getAIRequestTarget(config)
      const permissionGranted = await ensureAIHostPermission(target.baseUrl)
      if (!permissionGranted) throw new Error('未获得 AI 服务域名访问权限')

      await saveAIConfig(config)
      setNotice({
        type: 'success',
        content:
          config.mode === 'custom' && !config.rememberApiKey
            ? '配置已保存；API Key 仅保留到本次浏览器会话结束'
            : 'AI 服务配置已保存',
      })
    } catch (saveError) {
      setNotice(undefined)
      setError(saveError instanceof Error ? saveError.message : '配置保存失败')
    }
  }

  const handleClearResult = () => {
    setOperations([])
    setHasAIGenerated(false)
    setApplyResult(undefined)
    setError('')
    setNotice(undefined)
  }

  const updateMode = (mode: AIConfig['mode']) => {
    setConfig((current) => ({ ...current, mode }))
  }

  return (
    <div className={styles['ai-fill']}>
      <div className={styles['ai-fill-header']}>
        <div>
          <div className={styles['ai-fill-title']}>AI 辅助填充</div>
          <div className={styles['ai-fill-subtitle']}>完整 FormGraph → 路径操作 → 真实回填结果</div>
        </div>
        <div className={styles['header-actions']}>
          <Tooltip content="复制完整 FormGraph">
            <Button
              type="text"
              size="mini"
              shape="circle"
              aria-label="复制完整 FormGraph"
              disabled={!formGraph}
              icon={<IconCopy />}
              onClick={handleCopyFormGraph}
            />
          </Tooltip>
          <Tooltip content={configVisible ? '收起 AI 配置' : '配置 AI'}>
            <Button
              type="text"
              size="mini"
              shape="circle"
              aria-label={configVisible ? '收起 AI 配置' : '配置 AI'}
              icon={<IconSettings />}
              onClick={() => setConfigVisible(!configVisible)}
            />
          </Tooltip>
        </div>
      </div>

      {configVisible && (
        <div className={styles['ai-fill-config']}>
          <div className={styles['config-item']}>
            <label className={styles['config-label']}>服务模式</label>
            <div className={styles['mode-actions']}>
              <Button
                size="small"
                type={config.mode === 'builtin' ? 'primary' : 'secondary'}
                onClick={() => updateMode('builtin')}
              >
                内置服务
              </Button>
              <Button
                size="small"
                type={config.mode === 'custom' ? 'primary' : 'secondary'}
                onClick={() => updateMode('custom')}
              >
                自定义服务
              </Button>
            </div>
          </div>

          {config.mode === 'builtin' ? (
            <div className={styles['config-note']}>
              {hasBuiltinAIConfig
                ? builtinAIKind === 'development'
                  ? '开发模式：使用本地 .env/.env.local 中的 OpenRouter Key，仅用于受控 PoC。'
                  : '生产模式：通过内置 Gateway 请求，模型服务密钥不会进入扩展。'
                : '当前没有可用的内置服务。开发时可在 .env.local 中提供 OPENROUTER_API_KEY，或切换到自定义服务。'}
            </div>
          ) : (
            <>
              <div className={styles['config-item']}>
                <label className={styles['config-label']}>Base URL</label>
                <Input
                  size="small"
                  placeholder="https://openrouter.ai/api/v1"
                  value={config.baseUrl}
                  onChange={(value: string) =>
                    setConfig((current) => ({
                      ...current,
                      baseUrl: value,
                    }))
                  }
                />
              </div>
              <div className={styles['config-item']}>
                <label className={styles['config-label']}>API Key</label>
                <Input.Password
                  size="small"
                  placeholder="sk-..."
                  value={config.apiKey}
                  onChange={(value: string) =>
                    setConfig((current) => ({
                      ...current,
                      apiKey: value,
                    }))
                  }
                />
              </div>
              <div className={styles['config-item']}>
                <label className={styles['config-label']}>模型</label>
                <Input
                  size="small"
                  placeholder="openrouter/free"
                  value={config.model}
                  onChange={(value: string) =>
                    setConfig((current) => ({
                      ...current,
                      model: value,
                    }))
                  }
                />
              </div>
              <Checkbox
                checked={config.rememberApiKey}
                onChange={(checked: boolean) =>
                  setConfig((current) => ({
                    ...current,
                    rememberApiKey: checked,
                  }))
                }
              >
                在本机持久保存 API Key
              </Checkbox>
              <div className={styles['config-note']}>默认只保存到当前浏览器会话；关闭浏览器后需要重新输入。</div>
            </>
          )}

          <div className={styles['config-actions']}>
            <Button size="small" type="primary" onClick={handleSaveConfig}>
              保存
            </Button>
          </div>
        </div>
      )}

      <div className={styles['ai-fill-body']}>
        {!formGraph ? (
          <div className={styles['ai-fill-placeholder']}>请在左侧面板选择一个表单</div>
        ) : (
          <>
            <div className={styles['instruction']}>
              <label className={styles['config-label']}>希望生成什么数据</label>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="例如：生成三条员工数据，第一条是管理员，其余是普通员工"
                value={instruction}
                onChange={setInstruction}
              />
              <Alert
                type="warning"
                content="使用 AI 生成会将当前完整 FormGraph 发送给所选服务，其中可能包含当前表单值、初始值和字段配置。请勿用于未经授权的敏感数据。"
                showIcon
              />
              <Checkbox
                checked={dataSharingAcknowledged}
                onChange={(checked: boolean) => setDataSharingAcknowledged(checked)}
              >
                我确认将当前完整 FormGraph 发送给所选 AI 服务
              </Checkbox>
            </div>

            <div className={styles['ai-fill-actions']}>
              <Button
                type="primary"
                size="small"
                loading={loading}
                disabled={loading || applying}
                onClick={handleGenerate}
              >
                {loading
                  ? hasAIGenerated
                    ? '重新生成中...'
                    : 'AI 生成中...'
                  : hasAIGenerated
                    ? '重新生成'
                    : '使用 AI 生成'}
              </Button>
              <Button size="small" disabled={loading || applying} onClick={handleSmoke}>
                本地 Smoke
              </Button>
            </div>

            {error && (
              <div className={styles['ai-fill-error']}>
                <span className={styles['error-icon']}>✕</span> {error}
              </div>
            )}

            {notice && <Alert type={notice.type} content={notice.content} showIcon />}

            {operations.length > 0 && (
              <div className={styles['ai-fill-result']}>
                <div className={styles['result-header']}>
                  <span>
                    {applyResult ? '待重试操作' : '待执行操作'}（{operations.length}）
                  </span>
                  <Button size="small" onClick={handleClearResult}>
                    清空
                  </Button>
                </div>
                <pre className={styles['result-json']}>{JSON.stringify({ operations }, null, 2)}</pre>
                <div className={styles['result-actions']}>
                  <Button type="primary" size="small" loading={applying} disabled={loading} onClick={handleFill}>
                    {applying ? '正在填充...' : '确认填充到表单'}
                  </Button>
                </div>
              </div>
            )}

            {applyResult && (
              <div className={styles['apply-result']}>
                <div className={styles['result-header']}>真实执行结果</div>
                <pre className={styles['result-json']}>{JSON.stringify(applyResult, null, 2)}</pre>
              </div>
            )}

            {loading && (
              <div className={styles['ai-fill-loading']}>
                <Spin size={16} />
                <span>正在把完整 FormGraph 交给 AI，请稍候...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AIFill
