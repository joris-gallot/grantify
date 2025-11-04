import type { GrantifyInstance, RuleMap } from '@grantify/core'
import type { App, InjectionKey } from 'vue'
import { inject } from 'vue'

const grantifyInstanceKey = Symbol('grantify-instance') as InjectionKey<GrantifyInstance<any, any, any>>

export function useGrantify() {
  const grantify = inject(grantifyInstanceKey)

  if (!grantify) {
    throw new Error('Grantify instance is not provided.')
  }

  return grantify
}

export default <U, P extends string, RM extends RuleMap<P>>(grantifyInstance: GrantifyInstance<U, P, RM>) => {
  return {
    install(app: App) {
      app.provide(grantifyInstanceKey, grantifyInstance)
    },
  }
}
