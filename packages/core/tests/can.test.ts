import { assertType, describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('can - synchronous rules', () => {
  it('should return true when rule passes without context', () => {
    const grantify = createGrantify({
      permissions: ['post:create'] as const,
      user: { id: 1 },
    })
      .defineRule('post:create', user => user.id === 1)
      .build()

    const result = grantify.can('post:create')
    expect(result).toBe(true)

    assertType<boolean>(result)
  })

  it('should return false when rule fails without context', () => {
    const grantify = createGrantify({
      permissions: ['post:create'] as const,
      user: { id: 1 },
    })
      .defineRule('post:create', user => user.id === 2)
      .build()

    const result = grantify.can('post:create')
    expect(result).toBe(false)

    assertType<boolean>(result)
  })

  it('should use default user when no user provided', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('read', user => user.name === 'John')
      .build()

    const result = grantify.can('read')
    expect(result).toBe(true)

    assertType<boolean>(result)
  })

  it('should use provided user instead of default user', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('read', user => user.name === 'Jane')
      .build()

    const result = grantify.can('read', { id: 2, name: 'Jane' })
    expect(result).toBe(true)

    assertType<boolean>(result)
  })

  it('should pass context to rule callback', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule(
        'post:edit',
        (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    const result1 = grantify.can('post:edit', { id: 1, isAdmin: false }, { isOwner: true })
    const result2 = grantify.can('post:edit', { id: 1, isAdmin: false }, { isOwner: false })

    expect(result1).toBe(true)
    expect(result2).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
  })

  it('should handle undefined context', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule(
        'post:edit',
        (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    const result = grantify.can('post:edit')
    expect(result).toBe(false)

    assertType<boolean>(result)
  })

  it('should handle admin user with context', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: true },
    })
      .defineRule(
        'post:edit',
        (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    const result = grantify.can('post:edit', { id: 1, isAdmin: true }, { isOwner: false })
    expect(result).toBe(true)

    assertType<boolean>(result)
  })

  it('should normalize permission names when checking', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    const result = grantify.can(' read ' as any)
    expect(result).toBe(true)

    assertType<boolean | Promise<boolean>>(result)
  })

  it('should throw error for undefined permission', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(() => grantify.can('write' as any)).toThrow('Permission "write" is not defined.')
  })

  it('should throw error when no rule defined for permission', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(() => grantify.can('write')).toThrow('No rule defined for permission "write".')
  })

  it('should return false when rule returns non-boolean value', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => undefined as any)
      .build()

    expect(grantify.can('read')).toBe(false)
  })

  it('should handle multiple context properties', () => {
    const grantify = createGrantify({
      permissions: ['action'] as const,
      user: { id: 1, role: 'user' },
    })
      .defineRule(
        'action',
        (user, ctx: { flag1: boolean, flag2: boolean, value: number } | undefined) => {
          if (!ctx)
            return false
          return ctx.flag1 && ctx.flag2 && ctx.value > 10
        },
      )
      .build()

    const result1 = grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: true, value: 15 })
    const result2 = grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: false, value: 15 })
    const result3 = grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: true, value: 5 })

    expect(result1).toBe(true)
    expect(result2).toBe(false)
    expect(result3).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
    assertType<boolean>(result3)
  })

  it('should handle null context', () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule(
        'test',
        (user, ctx: { value?: string } | undefined) => ctx?.value === 'expected',
      )
      .build()

    const result = grantify.can('test', { id: 1 }, null as any)
    expect(result).toBe(false)

    assertType<boolean>(result)
  })

  it('should evaluate rules independently for each call', () => {
    let counter = 0
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', () => {
        counter++
        return true
      })
      .build()

    grantify.can('test')
    grantify.can('test')
    grantify.can('test')

    expect(counter).toBe(3)
  })
})

describe('can - asynchronous rules', () => {
  it('should return promise when rule is async', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => await Promise.resolve(true))
      .build()

    const result = grantify.can('post:delete')
    expect(result).toBeInstanceOf(Promise)
    expect(await result).toBe(true)

    assertType<Promise<boolean>>(result)
  })

  it('should resolve to true when async rule passes', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.id === 1))
      .build()

    const result = grantify.can('post:delete')
    await expect(result).resolves.toBe(true)

    assertType<Promise<boolean>>(result)
  })

  it('should resolve to false when async rule fails', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.id === 2))
      .build()

    const result = grantify.can('post:delete')
    await expect(result).resolves.toBe(false)

    assertType<Promise<boolean>>(result)
  })

  it('should pass user to async rule', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.name === 'Jane'))
      .build()

    const result = grantify.can('post:delete', { id: 2, name: 'Jane' })
    await expect(result).resolves.toBe(true)

    assertType<Promise<boolean>>(result)
  })

  it('should pass context to async rule', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule(
        'post:delete',
        async (user, ctx: { force: boolean } | undefined) => await Promise.resolve(user.isAdmin || (ctx?.force ?? false)),
      )
      .build()

    const result1 = grantify.can('post:delete', { id: 1, isAdmin: false }, { force: true })
    const result2 = grantify.can('post:delete', { id: 1, isAdmin: false }, { force: false })

    await expect(result1).resolves.toBe(true)
    await expect(result2).resolves.toBe(false)

    assertType<Promise<boolean>>(result1)
    assertType<Promise<boolean>>(result2)
  })

  it('should handle async rule rejection', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => await Promise.reject(new Error('DB error')))
      .build()

    const result = grantify.can('post:delete')
    await expect(result).rejects.toThrow('DB error')

    assertType<Promise<boolean>>(result)
  })

  it('should handle delayed async resolution', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return true
      })
      .build()

    const result = grantify.can('post:delete')
    await expect(result).resolves.toBe(true)

    assertType<Promise<boolean>>(result)
  })

  it('should use default user in async rules', async () => {
    const grantify = createGrantify({
      permissions: ['action'] as const,
      user: { id: 42, role: 'admin' },
    })
      .defineRule('action', async user => await Promise.resolve(user.id === 42 && user.role === 'admin'))
      .build()

    const result = grantify.can('action')
    await expect(result).resolves.toBe(true)

    assertType<Promise<boolean>>(result)
  })

  it('should handle async rules with complex context', async () => {
    interface Context {
      resource: { id: number, ownerId: number }
      action: 'read' | 'write'
    }

    const grantify = createGrantify({
      permissions: ['resource:access'] as const,
      user: { id: 1 },
    })
      .defineRule(
        'resource:access',
        async (user, ctx: Context | undefined) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          if (!ctx)
            return false
          return ctx.resource.ownerId === user.id && ctx.action === 'write'
        },
      )
      .build()

    const result1 = grantify.can('resource:access', { id: 1 }, { resource: { id: 100, ownerId: 1 }, action: 'write' })
    const result2 = grantify.can('resource:access', { id: 1 }, { resource: { id: 100, ownerId: 2 }, action: 'write' })

    await expect(result1).resolves.toBe(true)
    await expect(result2).resolves.toBe(false)

    assertType<Promise<boolean>>(result1)
    assertType<Promise<boolean>>(result2)
  })

  it('should handle async rules that return false', async () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return false
      })
      .build()

    const result = grantify.can('test')
    await expect(result).resolves.toBe(false)

    assertType<Promise<boolean>>(result)
  })

  it('should handle async rules with undefined context', async () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule(
        'test',
        async (user, ctx: { flag: boolean } | undefined) => await Promise.resolve(ctx?.flag ?? false),
      )
      .build()

    const result = grantify.can('test')
    await expect(result).resolves.toBe(false)

    assertType<Promise<boolean>>(result)
  })
})

describe('can - mixed sync and async', () => {
  it('should handle both sync and async rules in same instance', async () => {
    const grantify = createGrantify({
      permissions: ['sync', 'async'] as const,
      user: { id: 1 },
    })
      .defineRule('sync', () => true)
      .defineRule('async', async () => await Promise.resolve(true))
      .build()

    const syncResult = grantify.can('sync')
    const asyncResult = grantify.can('async')

    expect(syncResult).toBe(true)
    await expect(asyncResult).resolves.toBe(true)

    assertType<boolean>(syncResult)
    assertType<Promise<boolean>>(asyncResult)
  })

  it('should not affect sync rules when async rules are defined', () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1 },
    })
      .defineRule('a', () => true)
      .defineRule('b', async () => await Promise.resolve(false))
      .defineRule('c', () => false)
      .build()

    const resultA = grantify.can('a')
    const resultC = grantify.can('c')

    expect(resultA).toBe(true)
    expect(resultC).toBe(false)

    assertType<boolean>(resultA)
    assertType<boolean>(resultC)
  })

  it('should handle multiple async rules independently', async () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1 },
    })
      .defineRule('a', async () => await Promise.resolve(true))
      .defineRule('b', async () => await Promise.resolve(false))
      .defineRule('c', async () => await Promise.reject(new Error('error')))
      .build()

    const resultA = grantify.can('a')
    const resultB = grantify.can('b')
    const resultC = grantify.can('c')

    await expect(resultA).resolves.toBe(true)
    await expect(resultB).resolves.toBe(false)
    await expect(resultC).rejects.toThrow('error')

    assertType<Promise<boolean>>(resultA)
    assertType<Promise<boolean>>(resultB)
    assertType<Promise<boolean>>(resultC)
  })
})
