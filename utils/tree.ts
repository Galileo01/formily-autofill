import { FormPath } from '@formily/shared'
import { TreeDataType } from '@arco-design/web-react/es/Tree/interface'

const findParentLoop: (node: any, parentPath: FormPath) => any = (node: any, parentPath: FormPath) => {
  if (FormPath.parse(node.path).match(parentPath)) {
    return node
  } else {
    for (let i = 0; i < node?.children?.length; i++) {
      const parent = findParentLoop(node.children[i], parentPath)
      if (parent) {
        return parent
      }
    }
  }
}

const getParentPath = (dataSource: any, key: string) => {
  let parentPath: FormPath = FormPath.parse(key)
  let i = 0
  while (true) {
    parentPath = parentPath.parent()
    if (dataSource[parentPath.toString()]) {
      return parentPath
    }
    if (i > parentPath.segments.length) return parentPath
    i += 1
  }
}

export const createTree = (dataSource: any, cursor?: any) => {
  const tree: any = {}

  const findParent = (key: string): any => {
    const parentPath = getParentPath(dataSource, key)

    return findParentLoop(tree, parentPath)
  }

  Object.keys(dataSource || {}).forEach((key) => {
    if (key == '') {
      tree.name = 'Form'
      tree.path = key
      tree.toggled = true
      tree.data = dataSource[key]
      if (cursor && cursor.current && cursor.current.path === key) {
        tree.active = true
        cursor.current = tree
      }
    } else {
      const node: any = {
        name: key,
        path: key,
        toggled: true,
        data: dataSource[key],
      }
      if (cursor && cursor.current && cursor.current.path === key) {
        node.active = true
        cursor.current = node
      }
      const parent = findParent(key)
      if (parent) {
        node.name = (node.path || '').slice(parent && parent.path ? parent.path.length + 1 : 0)
        parent.children = parent.children || []
        parent.children.push(node)
      }
    }
  })
  return tree
}

export const searchData = (inputValue: string, data: TreeDataType[]) => {
  const loop = (data: TreeDataType[]) => {
    const result: TreeDataType[] = []
    data.forEach((item) => {
      if (typeof item.name === 'string' && item.name?.toLowerCase()?.indexOf(inputValue.toLowerCase()) > -1) {
        result.push({ ...item })
      } else if (item.children) {
        const filterData = loop(item.children)

        if (filterData.length) {
          result.push({ ...item, children: filterData })
        }
      }
    })
    return result
  }

  return loop(data)
}
