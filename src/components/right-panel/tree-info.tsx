import * as React from 'react'

import ReactJson from '@microlink/react-json-view'

export type TreeInfoProps = {
  treeData: any
}

const TreeInfo = (props: TreeInfoProps) => {
  const { treeData } = props
  return (
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
  )
}

export default TreeInfo
