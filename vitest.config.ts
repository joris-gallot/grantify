import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          include: ['packages/core/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: ['packages/**/src/**/*.ts'],
      thresholds: {
        100: true,
      },
    },
  },
})
