import type { ApplyFillResult, FillOperation, FormInstanceId } from '@/ai/types'
import { applyFillOperations } from '@/ai/apply'

export type HooKType = {
  hasFormilyInstance: boolean
  hasOpenDevtools: boolean
  store: Record<string, any>
  openDevtools: () => void
  closeDevtools: () => void
  setVm: (fieldId: string, formId: string) => void
  update: () => void
  unmount: (id: FormInstanceId) => void
  inject: (id: FormInstanceId, form: any) => void
  setValues: (formId: FormInstanceId, values: Record<string, any>) => void
  applyFillOperations: (formId: FormInstanceId, operations: FillOperation[]) => ApplyFillResult
}

export default defineUnlistedScript(() => {
  const serializeObject = (obj: any): any => {
    const seens = new WeakMap()
    const serialize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(serialize)
      } else if (typeof obj === 'function') {
        return `f ${obj.displayName || obj.name}(){ }`
      } else if (typeof obj === 'object') {
        if (seens.get(obj)) return '#CircularReference'
        if (!obj) return obj
        if ('$$typeof' in obj && '_owner' in obj) {
          seens.set(obj, true)
          return '#ReactNode'
        } else if (obj.toJS) {
          seens.set(obj, true)
          return obj.toJS()
        } else if (obj.toJSON) {
          seens.set(obj, true)
          return obj.toJSON()
        } else {
          seens.set(obj, true)
          const result: Record<string, any> = {}
          for (const key in obj) {
            result[key] = serialize(obj[key])
          }
          seens.set(obj, false)
          return result
        }
      }
      return obj
    }
    return serialize(obj)
  }

  const send = ({ type, id, form }: { type: string; id?: string | number; form?: any }) => {
    const graph = serializeObject(form?.getFormGraph())
    window.postMessage(
      {
        source: '@formily-autofill',
        type,
        id,
        graph:
          form &&
          JSON.stringify(graph, (key, value) => {
            if (typeof value === 'symbol') {
              return value.toString()
            }
            return value
          }),
      },
      '*'
    )
  }

  send({
    type: 'init',
  })

  const Hook: HooKType = {
    hasFormilyInstance: false,
    hasOpenDevtools: false,
    store: {},
    openDevtools() {
      this.hasOpenDevtools = true
    },
    closeDevtools() {
      this.hasOpenDevtools = false
    },
    setVm(fieldId: string, formId: string) {
      void fieldId
      void formId
      // if (fieldId) {
      //   globalThis.$vm = this.store[formId].fields[fieldId];
      // } else {
      //   globalThis.$vm = this.store[formId];
      // }
    },
    inject(id: FormInstanceId, form: any) {
      this.hasFormilyInstance = true
      this.store[id] = form
      send({
        type: 'install',
        id,
        form,
      })
      let timer: NodeJS.Timeout | null = null
      const task = () => {
        globalThis.requestIdleCallback((deadline) => {
          if (this.store[id]) {
            //剩余空闲时间不够 下次执行
            if (deadline.timeRemaining() < 16) {
              task()
            } else {
              send({
                type: 'update',
                id,
                form,
              })
            }
          }
        })
      }
      form.subscribe(() => {
        if (!this.hasOpenDevtools) return
        if (timer) clearTimeout(timer)
        timer = globalThis.setTimeout(task, 300)
      })
    },
    update() {
      const keys = Object.keys(this.store || {})
      keys.forEach((id) => {
        send({
          type: 'update',
          id,
          form: this.store[id],
        })
      })
    },
    unmount(id: FormInstanceId) {
      delete this.store[id]
      send({
        type: 'uninstall',
        id,
      })
    },
    setValues(formId: FormInstanceId, values: Record<string, any>) {
      const form = this.store[formId]
      if (!form) {
        console.warn('[FormilyAutofill] form not found for id:', formId)
        return
      }
      try {
        form.setValues(values)
      } catch (e) {
        console.warn('[FormilyAutofill] setValues failed:', e)
      }
    },
    applyFillOperations(formId: FormInstanceId, operations: FillOperation[]) {
      return applyFillOperations(this.store[formId], formId, operations, serializeObject)
    },
  }

  // @ts-expect-error globalThis 不存在对应字段
  globalThis.__FORMILY_DEV_TOOLS_HOOK__ = Hook
  // @ts-expect-error globalThis 不存在对应字段
  globalThis.__UFORM_DEV_TOOLS_HOOK__ = Hook
  // @ts-expect-error globalThis 不存在对应字段
  globalThis.__FORMILY_AUTOFILL_HOOK__ = Hook
})
