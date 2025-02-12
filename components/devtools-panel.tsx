import * as React from 'react'

import LeftPanel, { LeftPanelProps } from './left-panel'
import RightPanel from './right-panel'

export type DevtoolPanelProps = Pick<LeftPanelProps, 'formDataSource'>

const DevtoolPanel = (props: DevtoolPanelProps) => {
  const { formDataSource } = props

  const [currentTree, setCurrentTree] = React.useState<any>()
  const handleTreeSelect: LeftPanelProps['onTreeSelect'] = React.useCallback((formStoreItem, treeKey) => {
    console.log('dev handleTreeSelect', formStoreItem, treeKey, formStoreItem.form[treeKey])
    setCurrentTree(formStoreItem.form[treeKey])
    // chrome.devtools.inspectedWindow.eval(`window.__FORMILY_DEV_TOOLS_HOOK__.setVm("${treeKey}","${formStoreItem.id}")`)
  }, [])

  return (
    <div className="flex gap-2 absolute inset-0">
      <LeftPanel formDataSource={formDataSource} onTreeSelect={handleTreeSelect} />
      <RightPanel treeData={currentTree} />
    </div>
  )
}

export default DevtoolPanel
