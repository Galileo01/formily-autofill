import * as React from 'react'

import ReactJson from '@microlink/react-json-view'

export type RightPanelProps = {
  treeData: any
}

const RightPanel = (props: RightPanelProps) => {
  const { treeData } = props
  console.log('dev treeData', treeData)
  return (
    <div className="w-[50%] shrink-0 overflow-y-auto p-4">
      <ReactJson
        src={treeData}
        name={treeData && treeData.displayName}
        displayDataTypes={false}
        sortKeys={true}
        onEdit={false}
        onAdd={false}
        onDelete={false}
        iconStyle="square"
      />
    </div>
  )
}

export default RightPanel
