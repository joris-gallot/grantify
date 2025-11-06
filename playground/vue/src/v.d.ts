import type { CanDirective, GrantifyVue } from '@grantify/vue'

export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    vCan: CanDirective<GrantifyVue['instance']>
  }
}
