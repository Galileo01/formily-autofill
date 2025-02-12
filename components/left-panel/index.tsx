import * as React from 'react'

import { Tabs, Tree, Input, TreeProps } from '@arco-design/web-react'
import { TreeDataType } from '@arco-design/web-react/es/Tree/interface'

import { createTree, searchData } from '@/utils/tree'

import styles from './index.module.less'

export type FormStoreItem = {
  id: string
  form: any
}

export type LeftPanelProps = {
  formDataSource: FormStoreItem[]
  onTreeSelect: (formStoreItem: FormStoreItem, treeKey: string) => void
}

const { TabPane } = Tabs

export type FormItemData = {
  title: string
  displayName: string
}

const renderTitle: TreeProps['renderTitle'] = (props) => {
  const { title, dataRef } = props

  return (
    <span>
      <span className="text-black">{title}</span>
      <span className="text-zinc-500">
        {dataRef?.path
          ? `  ${[dataRef?.data?.displayName, dataRef?.data?.title].filter((item) => item).join(' ')}`
          : ''}
      </span>
    </span>
  )
}

const LeftPanel = (props: LeftPanelProps) => {
  const { formDataSource, onTreeSelect } = props

  const [activeTab, setActiveTab] = React.useState<string | undefined>()
  const [treeAllData, setTreeAllData] = React.useState<TreeDataType[]>([])
  const [inputValue, setInputValue] = React.useState('')

  const treeData = React.useMemo<TreeDataType[]>(
    () => (inputValue ? searchData(inputValue, treeAllData) : treeAllData),
    [inputValue, treeAllData]
  )

  const updateTreeTab = React.useCallback(
    (key: string) => {
      const [id, index] = key.split('-')
      setActiveTab(key)
      const formStoreItem = formDataSource[Number(index)]
      const root = createTree(formStoreItem.form)
      setTreeAllData([root])
      // From 节点的key 是 ""
      onTreeSelect(formStoreItem, '')
    },
    [formDataSource, onTreeSelect]
  )

  const handleTreeSelect = (selectedKeys: string[]) => {
    const [id, index] = activeTab!.split('-')
    const formStoreItem = formDataSource[Number(index)]
    console.log('dev onSelect', formStoreItem, selectedKeys[0])
    onTreeSelect(formStoreItem, selectedKeys[0])
  }

  // 初始化数据 刷新数据
  React.useEffect(() => {
    if (!formDataSource.length) {
      return
    }

    setTreeAllData([createTree(formDataSource[0].form)])
    const defaultTab = `${formDataSource[0].id}-0`
    // 有值 校验 并刷新
    if (activeTab) {
      const [id, index] = activeTab.split('-')
      // 页面刷新 form.id 会发生变化  ，需要校验id
      const idValid = formDataSource.findIndex((item) => item.id === id) > -1
      updateTreeTab(idValid ? activeTab : defaultTab)
    }
    //  为空 初始化
    else {
      updateTreeTab(defaultTab)
    }
  }, [formDataSource, onTreeSelect, activeTab, updateTreeTab])

  return (
    <Tabs type="card" className={styles['form-tabs']} activeTab={activeTab} onChange={updateTreeTab}>
      {formDataSource.map((item, index) => {
        return (
          <TabPane key={`${item.id}-${index}`} title={`Form${index + 1}`}>
            <Input.Search placeholder="Search" className={'mb-2'} value={inputValue} onChange={setInputValue} />
            <Tree
              autoExpandParent
              treeData={treeData}
              fieldNames={{
                key: 'path',
                title: 'name',
              }}
              onSelect={handleTreeSelect}
              renderTitle={renderTitle}
            />
          </TabPane>
        )
      })}
    </Tabs>
  )
}

export default LeftPanel
