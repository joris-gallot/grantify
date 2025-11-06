import type { GrantifyInstance } from '@grantify/core'

export interface GrantifyVue {
  instance: GrantifyInstance<any, any, any>
}

export type GrantifyUser<T> = T extends GrantifyInstance<infer U, any, any> ? U : never
export type GrantifyPermission<T> = T extends GrantifyInstance<any, infer P, any> ? P : never
