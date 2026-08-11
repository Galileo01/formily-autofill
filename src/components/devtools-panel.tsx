import * as React from 'react'

import LeftPanel, { LeftPanelProps } from './left-panel'
import RightPanel from './right-panel'

export type DevtoolPanelProps = Pick<LeftPanelProps, 'formDataSource'>

const DevtoolPanel = (props: DevtoolPanelProps) => {
  const { formDataSource } = props

  const [currentTree, setCurrentTree] = React.useState<any>()
  const [currentFormId, setCurrentFormId] = React.useState<string>()
  const [currentFormGraph, setCurrentFormGraph] = React.useState<Record<string, unknown>>()
  const [selectedPath, setSelectedPath] = React.useState<string>()

  const handleTreeSelect: LeftPanelProps['onTreeSelect'] = React.useCallback((formStoreItem, treeKey) => {
    setCurrentTree(formStoreItem.form[treeKey])
    setCurrentFormId(formStoreItem.id)
    setCurrentFormGraph(formStoreItem.form)
    setSelectedPath(treeKey || undefined)
  }, [])

  return (
    <div className="flex gap-2 absolute inset-0">
      <LeftPanel formDataSource={formDataSource} onTreeSelect={handleTreeSelect} />
      <RightPanel
        treeData={currentTree}
        formId={currentFormId}
        formGraph={currentFormGraph}
        selectedPath={selectedPath}
      />
    </div>
  )
}

export default DevtoolPanel
