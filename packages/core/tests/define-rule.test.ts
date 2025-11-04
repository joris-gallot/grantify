import { assertType, describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('defineRule', () => {
  it('should define a synchronous rule without context', () => {
    const grantify = createGrantify({
      permissions: ['post:create'] as const,
      user: { id: 1 },
    })
      .defineRule('post:create', user => user.id === 1)
      .build()

    expect(grantify.getRules()).toHaveLength(1)
    expect(grantify.getRules()[0]!.perm).toBe('post:create')

    const result = grantify.can('post:create')
    assertType<boolean>(result)
  })

  it('should define a synchronous rule with context', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule(
        'post:edit',
        (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    expect(grantify.getRules()).toHaveLength(1)

    const result = grantify.can('post:edit', { id: 1, isAdmin: false }, { isOwner: true })
    assertType<boolean>(result)
  })

  it('should define an async rule', () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => await Promise.resolve(true))
      .build()

    expect(grantify.getRules()).toHaveLength(1)
  })

  it('should chain multiple rule definitions', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write', 'delete'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .defineRule('write', () => false)
      .defineRule('delete', async () => await Promise.resolve(true))
      .build()

    expect(grantify.getRules()).toHaveLength(3)

    assertType<boolean>(grantify.can('read'))
    assertType<boolean>(grantify.can('write'))
    assertType<Promise<boolean>>(grantify.can('delete'))
  })

  it('should throw error for undefined permission', () => {
    expect(() => {
      createGrantify({
        permissions: ['read'] as const,
        user: { id: 1 },
      })
        .defineRule('write' as any, () => true)
    }).toThrow('Permission "write" is not defined.')
  })

  it('should normalize permission names with whitespace', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule(' read ' as any, () => true)
      .build()

    expect(grantify.getRules()[0]!.perm).toBe('read')
  })

  it('should allow defining rules with different callback signatures', () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1, role: 'admin' },
    })
      .defineRule('a', () => true)
      .defineRule('b', user => user.id > 0)
      .defineRule('c', (user, ctx: { flag: boolean } | undefined) => user.role === 'admin' && (ctx?.flag ?? false))
      .build()

    const rules = grantify.getRules()
    expect(rules).toHaveLength(3)
    expect(rules[0]!.cb({ id: 1, role: 'admin' })).toBe(true)
    expect(rules[1]!.cb({ id: 1, role: 'admin' })).toBe(true)
    expect(rules[2]!.cb({ id: 1, role: 'admin' }, { flag: true })).toBe(true)

    assertType<boolean>(grantify.can('a'))
    assertType<boolean>(grantify.can('b'))
    assertType<boolean>(grantify.can('c', { id: 1, role: 'admin' }, { flag: true }))
  })

  it('should preserve callback reference', () => {
    const callback = (user: { id: number }) => user.id === 1
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', callback)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]!.cb).toBe(callback)
  })

  it('should handle async callbacks correctly', () => {
    const asyncCallback = async (user: { id: number }) => await Promise.resolve(user.id === 1)
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', asyncCallback)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]!.cb).toBe(asyncCallback)
  })

  it('should allow multiple rules to be defined in any order', () => {
    const grantify = createGrantify({
      permissions: ['z', 'a', 'm'] as const,
      user: { id: 1 },
    })
      .defineRule('z', () => true)
      .defineRule('a', () => false)
      .defineRule('m', () => true)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]!.perm).toBe('z')
    expect(rules[1]!.perm).toBe('a')
    expect(rules[2]!.perm).toBe('m')
  })

  it('should support builder pattern with method chaining', () => {
    const builder = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1 },
    })

    const builder2 = builder.defineRule('a', () => true)
    const builder3 = builder2.defineRule('b', () => false)
    const grantify = builder3.defineRule('c', () => true).build()

    expect(grantify.getRules()).toHaveLength(3)
  })

  it('should handle rules with complex context types', () => {
    interface ComplexContext {
      resource: {
        ownerId: number
        teamId: number
        isPublic: boolean
      }
      action?: 'read' | 'write'
      timestamp?: number
    }

    const grantify = createGrantify({
      permissions: ['resource:access'] as const,
      user: { id: 1, teamId: 10 },
    })
      .defineRule(
        'resource:access',
        (user, ctx: ComplexContext | undefined) => {
          if (!ctx)
            return false
          return ctx.resource.isPublic || ctx.resource.ownerId === user.id || ctx.resource.teamId === user.teamId
        },
      )
      .build()

    expect(grantify.getRules()).toHaveLength(1)

    const result = grantify.can(
      'resource:access',
      { id: 1, teamId: 10 },
      {
        resource: {
          ownerId: 1,
          teamId: 10,
          isPublic: false,
        },
      },
    )
    assertType<boolean>(result)
  })

  it('should not mutate original permissions array', () => {
    const permissions = ['read', 'write'] as const

    const _ = createGrantify({
      permissions,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(permissions).toEqual(['read', 'write'])
  })

  it('should enforce correct types and throw for invalid permissions', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    assertType<boolean>(grantify.can('read'))

    expect(() => grantify.can('write' as any)).toThrow('Permission "write" is not defined.')
  })

  it('should handle mixed sync and async with correct types', () => {
    const grantify = createGrantify({
      permissions: ['sync', 'async'] as const,
      user: { id: 1 },
    })
      .defineRule('sync', () => true)
      .defineRule('async', async () => await Promise.resolve(false))
      .build()

    assertType<boolean>(grantify.can('sync'))
    assertType<Promise<boolean>>(grantify.can('async'))
  })

  it('should type check context parameters correctly', () => {
    const grantify = createGrantify({
      permissions: ['action'] as const,
      user: { id: 1 },
    })
      .defineRule('action', (user, ctx: { value: string, flag: boolean } | undefined) => {
        if (!ctx)
          return false
        return ctx.value === 'test' && ctx.flag
      })
      .build()

    const result = grantify.can('action', { id: 1 }, { value: 'test', flag: true })
    assertType<boolean>(result)
  })
})
