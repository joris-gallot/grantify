import type { App, InjectionKey } from 'vue'
import type { GrantifyVue } from './types'
import { inject } from 'vue'
import directive from './directive'

export type * from './directive'
export type * from './types'

const grantifyInstanceKey = Symbol('grantify-instance') as InjectionKey<GrantifyVue['instance']>

export function useGrantify(): GrantifyVue['instance'] {
  const grantify = inject(grantifyInstanceKey)

  if (!grantify) {
    throw new Error('Grantify instance is not provided.')
  }

  return grantify
}

export default <G extends GrantifyVue['instance']>(grantifyInstance: G) => {
  return {
    install(app: App) {
      app.provide(grantifyInstanceKey, grantifyInstance)
      app.directive('can', directive(grantifyInstance))
    },
  }
}
