import * as React from 'react'

import './App.css'
import '@/assets/tailwind.css'

import DevtoolPanel from '@/components/devtools-panel'
import { FormStoreItem } from '@/components/left-panel'

const backgroundPageConnection = chrome.runtime.connect({
  name: '@formily-autofill',
})

backgroundPageConnection.postMessage({
  name: 'init',
  tabId: chrome.devtools.inspectedWindow.tabId,
})

chrome.devtools.inspectedWindow.eval('window.__FORMILY_DEV_TOOLS_HOOK__.openDevtools()')

function App() {
  const [formDataSource, setFormDataSource] = React.useState<FormStoreItem[]>([])
  const formDataSourceRef = React.useRef<Record<string, any>>({})

  React.useEffect(() => {
    const update = () => {
      setFormDataSource(
        Object.keys(formDataSourceRef.current).map((key) => ({
          id: key,
          form: formDataSourceRef.current[key],
        }))
      )
    }

    chrome.devtools.inspectedWindow.eval('window.__FORMILY_DEV_TOOLS_HOOK__.update()')

    const messageHandler = ({ type, id, graph }: { type: string; id: string; graph: string }) => {
      console.log('dev messageHandler', type, id)
      if (type === 'init') {
        formDataSourceRef.current = {}
        chrome.devtools.inspectedWindow.eval('window.__FORMILY_DEV_TOOLS_HOOK__.openDevtools()')
      } else if (type === 'uninstall') {
        delete formDataSourceRef.current[id]
      } else if (type === 'update' || type === 'install') {
        formDataSourceRef.current[id] = JSON.parse(graph)
      }

      update()
    }

    backgroundPageConnection.onMessage.addListener(messageHandler)

    return () => {
      backgroundPageConnection.onMessage.removeListener(messageHandler)
    }
  }, [])

  console.log('dev APP', formDataSource)

  return <DevtoolPanel formDataSource={formDataSource} />
}

export default App
