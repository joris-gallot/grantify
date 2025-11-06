import type { GrantifyInstance } from '@grantify/core'
import type { Directive } from 'vue'
import type { GrantifyPermission, GrantifyUser, GrantifyVue } from './types'

export type CanDirective<G extends GrantifyInstance<any, any, any>> = Directive<
  HTMLElement,
  GrantifyUser<G>,
  string,
  GrantifyPermission<G>
>

declare module 'vue' {
  export interface ComponentCustomProperties {
    vCan: CanDirective<GrantifyVue['instance']>
  }
}

export default <G extends GrantifyVue['instance']>(grantify: G) => {
  return {
    mounted: (el, binding) => {
      const permission = binding.arg

      if (!permission) {
        console.error('No permission provided to v-can directive.')
        return
      }

      const user = binding.value
      const can = grantify.can(permission, user)

      console.log(can)

      el.style.display = can ? '' : 'none'
      // if (!can) {
      //   el.remove()
      // }
    },
  } satisfies CanDirective<G>
}
