import * as React from 'react'

import { Tabs } from '@arco-design/web-react'

import AiFill from '@/components/ai-fill'

import TreeInfo, { TreeInfoProps } from './tree-info'

import styles from './index.module.less'

const { TabPane } = Tabs

export type RightPanelProps = TreeInfoProps & {
  formId?: string
  formGraph?: Record<string, unknown>
  selectedPath?: string
}

const RightPanel = (props: RightPanelProps) => {
  const { treeData, formId, formGraph, selectedPath } = props

  return (
    <Tabs type="card" className={styles['form-tabs']}>
      <TabPane title="表单信息" key="tree_info">
        <TreeInfo treeData={treeData} />
      </TabPane>
      <TabPane title="AI填充" key="ai_fill">
        <AiFill formGraph={formGraph} formId={formId} selectedPath={selectedPath} />
      </TabPane>
    </Tabs>
  )
}

export default RightPanel
