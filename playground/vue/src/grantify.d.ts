import type { grantify } from './grantify'

export {}

declare module '@grantify/vue' {
  interface GrantifyVue {
    instance: typeof grantify
  }
}
