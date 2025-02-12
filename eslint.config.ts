import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default tseslint.config({
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    eslintPluginPrettierRecommended,
  ],
  // files: ['**/*.{ts,tsx}'], // eslint 检测的文件，根据需要自行设置
  ignores: ['output', 'node_modules', '*.config.ts'],
  languageOptions: {
    ecmaVersion: 'latest',
    globals: globals.browser,
  },
  plugins: {
    'react-hooks': reactHooks,
    react,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'prettier/prettier': 'warn', // 默认为 error
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',

    '@typescript-eslint/no-explicit-any': 'off', // allow any type
    // 开启 hooks 规则
    'react-hooks/rules-of-hooks': 'error',
    // 打开 检查 effect 依赖 ，默认是关闭 的
    'react-hooks/exhaustive-deps': 'warn',
    // 覆盖 eslint-config-airbnb 和 react 里的配置
    //  允许 在ts、tsx 中书写 jsx
    'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
    // 修改 对于 函数式组件 声明方式(箭头函数 or 函数声明)的 校验
    'react/function-component-definition': [
      'error',
      {
        namedComponents: ['arrow-function', 'function-declaration'],
        unnamedComponents: ['arrow-function'],
      },
    ],
    // 关闭 组件可选prop 的必须传递 默认值  的校验
    'react/require-default-props': 'off',
    // 添加 snake_case  到 naming-convention 的  合法命名规则列表中
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
      },
    ],
    // 自定义组件 允许 使用扩展运算符  传递 props
    'react/jsx-props-no-spreading': [
      1,
      {
        custom: 'ignore',
      },
    ],
    // 以下两条 关闭 对于 执行无障碍标准 的强制校验
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    // 允许 for 循环的最后一个  一元表达式 使用 ++
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
  },
})
