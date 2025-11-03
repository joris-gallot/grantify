import type { Prettify } from './types'

export interface RuleDef<U, P extends string> {
  perm: P
  cb: (user: U, ctx?: any) => boolean | Promise<boolean>
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
  defineRule: <PP extends P, C, R extends boolean | Promise<boolean> = boolean | Promise<boolean>>(
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

  async function can(perm: Permission, user?: U, ctx?: any): Promise<boolean> {
    const permission = normalize(perm)
    const currentUser = user ?? defaultUser

    if (!allowedPermissions.includes(permission as any)) {
      throw new Error(`Permission "${permission}" is not defined.`)
    }

    const rule = rules.find(r => normalize(r.perm) === permission)

    if (!rule) {
      throw new Error(`No rule defined for permission "${permission}".`)
    }

    const result = rule.cb(currentUser, ctx)

    if (result instanceof Promise) {
      return await result
    }
    else if (typeof result === 'boolean') {
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

      rules.push({ perm: permission, cb })
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
