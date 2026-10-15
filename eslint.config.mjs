import antfu from '@antfu/eslint-config'
import prettier from 'eslint-config-prettier'

export default antfu({
  type: 'lib',
  typescript: true,
  stylistic: false,
  formatters: false,
  gitignore: true,
  test: true,
  react: true,
  ignores: ['**/pnpm-lock.yaml'],
  pnpm: {
    catalogs: false,
  },
}).append(prettier, {
  files: ['pnpm-workspace.yaml'],
  rules: {
    // React 18 and React 19 intentionally share package names across catalogs.
    'pnpm/yaml-no-duplicate-catalog-item': 'off',
  },
})
