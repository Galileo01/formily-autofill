import * as React from 'react'

import { Tabs } from '@arco-design/web-react'

import TreeInfo, { TreeInfoProps } from './tree-info'

import styles from './index.module.less'

const { TabPane } = Tabs

export type RightPanelProps = TreeInfoProps

const RightPanel = (props: RightPanelProps) => {
  const { treeData } = props
  return (
    <Tabs type="card" className={styles['form-tabs']}>
      <TabPane title="表单信息" key="tree_info">
        <TreeInfo treeData={treeData} />
      </TabPane>
    </Tabs>
  )
}

export default RightPanel
