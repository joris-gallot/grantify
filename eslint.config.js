import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    pnpm: true,
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'test/no-only-tests': 'error',
      'test/no-disabled-tests': 'error',
    },
  },
)
