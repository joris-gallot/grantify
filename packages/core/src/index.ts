import type { Prettify } from './types'

export interface RuleDef<U, P extends string> {
  perm: P
  cb: (user: U, ctx?: any) => boolean | Promise<boolean>
  async: boolean
}

export interface GrantifyOptions<U = unknown, P extends readonly string[] = []> {
  user: U
  permissions: P
}

type RuleMap<P extends string> = Record<P, {
  context: any
  async: boolean
}>

export interface GrantifyInstance<U, P extends string, RM extends RuleMap<P> = {}> {
  can: <PP extends P>(perm: PP, user?: U, ctx?: RM[PP]['context']) => RM[PP]['async'] extends true ? Promise<boolean> : boolean
  getRules: () => Prettify<RuleDef<U, P>>[]
}

export interface GrantifyBuilder<U = unknown, P extends string = string, RM extends RuleMap<P> = {}> {
  defineRule: <PP extends P, C, R extends boolean | Promise<boolean>>(
    perm: PP,
    cb: (user: U, ctx?: C) => R,
  ) => GrantifyBuilder<
    U,
    P,
    Prettify<RM & {
      [K in PP]: { async: R extends Promise<boolean> ? true : false, context: C }
    }>
  >
  build: () => GrantifyInstance<U, P, RM>
}

export function createGrantify<U = unknown, P extends readonly string[] = []>(
  options: GrantifyOptions<U, P>,
): GrantifyBuilder<U, P[number]> {
  type Permission = P[number]

  const rules: RuleDef<U, Permission>[] = []
  const defaultUser = options.user
  const allowedPermissions = options.permissions

  function normalize(p: string) {
    return p.trim()
  }

  function can(perm: Permission, user?: U, ctx?: any): boolean | Promise<boolean> {
    const permission = normalize(perm)
    const currentUser = user ?? defaultUser

    if (!allowedPermissions.includes(permission)) {
      throw new Error(`Permission "${permission}" is not defined.`)
    }

    const rule = rules.find(r => normalize(r.perm) === permission)

    if (!rule) {
      throw new Error(`No rule defined for permission "${permission}".`)
    }

    if (rule.async) {
      return Promise.resolve(rule.cb(currentUser, ctx))
    }

    const result = rule.cb(currentUser, ctx)

    if (typeof result === 'boolean') {
      return result
    }

    return false
  }

  function getRules() {
    return [...rules]
  }

  const builder: GrantifyBuilder<U, Permission> = {
    defineRule: (perm: Permission, cb: (user: U, ctx?: any) => boolean | Promise<boolean>) => {
      const permission = normalize(perm)

      if (!allowedPermissions.includes(permission)) {
        throw new Error(`Permission "${permission}" is not defined.`)
      }

      const isAsync = cb.constructor.name === 'AsyncFunction'

      rules.push({ perm: permission, cb, async: isAsync })
      return builder
    },

    build: (): GrantifyInstance<U, Permission> => {
      return {
        // @ts-expect-error -- Dynamic return type based on defined rules
        can,
        getRules,
      }
    },
  }

  return builder
}
